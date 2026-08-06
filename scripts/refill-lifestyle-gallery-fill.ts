/**
 * Top up Lifestyle to 100 using unique DummyJSON gallery frames
 * (alternate product shots not used as any primary image).
 * Names describe the parent product — no random stock hosts.
 *
 * Run: npx tsx scripts/refill-lifestyle-gallery-fill.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { salesPriceFromWholesale, wholesalePriceFromSales } from '../src/lib/wholesale-pricing'

function loadEnv() {
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TARGET = 100
const LIFE_SLUG = 'lifestyle'
const ALLOW_DJ = new Set([
  'sports-accessories',
  'tops',
  'mens-shirts',
  'womens-dresses',
  'mens-shoes',
  'womens-shoes',
  'motorcycle',
  'vehicle',
  'groceries',
  'beauty',
  'fragrances',
  'skin-care',
  'furniture',
  'home-decoration',
  'kitchen-accessories',
])

const SUFFIXES = ['Edition', 'Collection Piece', 'Select', 'Studio Pick', 'Daily', 'Reserve']

const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)

async function urlOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10000)
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, redirect: 'follow' })
    clearTimeout(t)
    const ct = res.headers.get('content-type') || ''
    return res.ok && ct.startsWith('image/')
  } catch {
    return false
  }
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', LIFE_SLUG).single()
  if (!cat) throw new Error('Lifestyle missing')

  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const need = TARGET - (existing || []).length
  console.log(`Lifestyle has ${(existing || []).length}, need ${need}`)
  if (need <= 0) return

  const { data: allProducts } = await supabase.from('products').select('id, name')
  const usedNames = new Set((allProducts || []).map((p) => p.name.toLowerCase()))
  const allIds = (allProducts || []).map((p) => p.id)
  const usedImages = new Set<string>()
  // Block ALL existing image URLs (primary + gallery) to avoid near-duplicates in carts
  for (let i = 0; i < allIds.length; i += 60) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', allIds.slice(i, i + 60))
    for (const r of imgs || []) usedImages.add(r.url)
  }

  const dj = (await (await fetch('https://dummyjson.com/products?limit=250')).json()) as {
    products: any[]
  }

  type Cand = { name: string; short: string; description: string; image: string; source: string }
  const cands: Cand[] = []

  for (const p of dj.products || []) {
    if (!ALLOW_DJ.has(p.category)) continue
    const base = String(p.title).trim()
    const imgs = Array.from(
      new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
    )
    let sidx = 0
    for (const img of imgs) {
      if (usedImages.has(img)) continue
      if (!(await urlOk(img))) continue
      // Skip primary frame of the canonical title if that product already exists —
      // still allow alternate frames with a distinct edition name
      const isPrimaryPath = /\/1\.webp$/i.test(img) || /thumbnail\.webp$/i.test(img)
      if (isPrimaryPath && usedNames.has(base.toLowerCase())) continue

      let name = base
      if (usedNames.has(name.toLowerCase()) || isPrimaryPath === false) {
        name = `${base} ${SUFFIXES[sidx % SUFFIXES.length]}`
        sidx++
        let n = 2
        while (usedNames.has(name.toLowerCase())) {
          name = `${base} ${SUFFIXES[sidx % SUFFIXES.length]} ${n}`
          n++
          sidx++
        }
      }
      usedNames.add(name.toLowerCase())
      usedImages.add(img)
      cands.push({
        name,
        short: p.brand ? `${p.brand} · ${name}` : name,
        description: p.description || name,
        image: img,
        source: `dj-${p.id}-alt`,
      })
      if (cands.length >= need + 5) break
    }
    if (cands.length >= need + 5) break
  }

  // Escuela leftovers
  if (cands.length < need) {
    const esc = (await (
      await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=200')
    ).json()) as any[]
    for (const p of esc || []) {
      if (cands.length >= need) break
      const name0 = String(p.title || '').trim()
      if (!name0 || /test|^string$|^ssss$/i.test(name0)) continue
      if (usedNames.has(name0.toLowerCase())) continue
      const raw = (p.images || [])
        .map((x: any) => (typeof x === 'string' ? x : ''))
        .filter(
          (u: string) =>
            u.startsWith('http') && !/placeimg|picsum|placehold|pravatar/i.test(u)
        )
      for (const img of raw) {
        if (usedImages.has(img)) continue
        if (!(await urlOk(img))) continue
        usedNames.add(name0.toLowerCase())
        usedImages.add(img)
        cands.push({
          name: name0,
          short: name0,
          description: p.description || name0,
          image: img,
          source: `esc-${p.id}`,
        })
        break
      }
    }
  }

  console.log(`Candidates: ${cands.length}`)
  if (cands.length < need) throw new Error(`Only ${cands.length} fill candidates, need ${need}`)

  const selected = cands.slice(0, need)
  const runTag = Date.now().toString(36)
  console.log(`Inserting ${selected.length}...`)

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const saleTarget = round2(320 + ((i * 41) % 1480))
    const wholesale = wholesalePriceFromSales(saleTarget)
    const sale = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `ls-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: sale,
        comparePrice: round2(sale * 1.12),
        wholesalePrice: wholesale,
        salePrice: sale,
        costPrice: wholesale,
        sku: `LS-G-${String(i + 1).padStart(3, '0')}-${runTag}`,
        stock: 15 + (i % 30),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 4,
        isPromoted: i % 7 === 0,
        rating: round2(3.9 + (i % 10) * 0.1),
        totalReviews: 5 + (i % 30),
        totalSales: i % 20,
        views: 30 + i * 4,
      })
      .select('id')
      .single()
    if (error || !product) throw error || new Error('insert failed')

    await supabase.from('product_images').insert({
      productId: product.id,
      url: item.image,
      alt: item.name,
      sortOrder: 0,
      isPrimary: true,
    })
    if ((i + 1) % 10 === 0) console.log(`  … ${i + 1}/${need}`)
  }

  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  console.log('Lifestyle published now:', count)
  if ((count || 0) < TARGET) throw new Error('still under 100')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
