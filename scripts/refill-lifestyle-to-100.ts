/**
 * Top up Lifestyle to 100 published products without stealing Home & Garden
 * DummyJSON photos (no home-decoration / furniture / kitchen-accessories).
 *
 * Run: npx tsx scripts/refill-lifestyle-to-100.ts
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
/** Categories owned by other rebuilt store sections */
const BLOCKED_DJ = new Set([
  'home-decoration',
  'furniture',
  'kitchen-accessories',
  'groceries',
  'mens-watches',
  'womens-watches',
  'womens-jewellery',
  'womens-bags',
  'sunglasses',
  'beauty',
  'fragrances',
  'skin-care',
  'smartphones',
  'laptops',
  'tablets',
  'mobile-accessories',
])
/** Titles reserved by Home & Garden / Accessories / Electronics */
const BLOCKED_TITLES = new Set([
  'honey jar',
  'cooking oil',
  'rice',
  'apple airpods',
  'apple airpods max silver',
  'beats flex wireless earphones',
  'apple watch series 4 gold',
  'apple magsafe battery pack',
  'iphone 12 silicone case with magsafe plum',
  'usb-c multiport hub',
])

/** Preferred DummyJSON fill cats for Lifestyle (clothing/sport until those sections are rebuilt) */
const PREFERRED_DJ = new Set([
  'sports-accessories',
  'tops',
  'mens-shirts',
  'womens-dresses',
  'mens-shoes',
  'womens-shoes',
  'motorcycle',
])

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

type Item = { name: string; short: string; description: string; images: string[]; source: string }

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', LIFE_SLUG).single()
  if (!cat) throw new Error('Lifestyle missing')

  const { data: existing } = await supabase
    .from('products')
    .select('id, name')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')

  const need = TARGET - (existing || []).length
  console.log(`Lifestyle has ${(existing || []).length}, need ${need} more`)
  if (need <= 0) {
    console.log('Already at target')
    return
  }

  // Global name + primary image uniqueness
  const { data: allProducts } = await supabase.from('products').select('id, name')
  const usedNames = new Set((allProducts || []).map((p) => p.name.toLowerCase()))
  const allIds = (allProducts || []).map((p) => p.id)
  const usedImages = new Set<string>()
  for (let i = 0; i < allIds.length; i += 80) {
    const chunk = allIds.slice(i, i + 80)
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', chunk)
      .eq('isPrimary', true)
    for (const r of imgs || []) usedImages.add(r.url)
  }

  const pool: Item[] = []
  const djRes = await fetch('https://dummyjson.com/products?limit=250')
  const dj = (await djRes.json()) as { products: any[] }
  for (const p of dj.products || []) {
    if (BLOCKED_DJ.has(p.category)) continue
    const name = String(p.title).trim()
    if (BLOCKED_TITLES.has(name.toLowerCase())) continue
    if (usedNames.has(name.toLowerCase())) continue
    const images = Array.from(
      new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
    )
    const good: string[] = []
    for (const img of images) {
      if (usedImages.has(img)) continue
      if (await urlOk(img)) good.push(img)
    }
    if (!good.length) continue
    pool.push({
      name,
      short: p.brand ? `${p.brand} · ${name}` : name,
      description: p.description || name,
      images: good.slice(0, 4),
      source: `dj-${p.id}`,
    })
  }

  // FakeStore jewellery / electronics / backpack fill
  const fsRes = await fetch('https://fakestoreapi.com/products')
  const fs = (await fsRes.json()) as any[]
  for (const p of fs || []) {
    if (!['jewelery', 'electronics'].includes(p.category) && !/backpack/i.test(p.title)) continue
    const name = String(p.title).trim()
    if (usedNames.has(name.toLowerCase())) continue
    if (usedImages.has(p.image)) continue
    if (!(await urlOk(p.image))) continue
    pool.push({
      name,
      short: name,
      description: p.description || name,
      images: [p.image],
      source: `fs-${p.id}`,
    })
  }

  // Escuela clothes/shoes that feel lifestyle (not furniture)
  const escRes = await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=150')
  const esc = (await escRes.json()) as any[]
  for (const p of esc || []) {
    const catName = String(p?.category?.name || '')
    if (!/Clothes|Shoes|Miscellaneous/i.test(catName)) continue
    const name = String(p.title || '').trim()
    if (!name || /test/i.test(name) || usedNames.has(name.toLowerCase())) continue
    const raw = (p.images || [])
      .map((x: any) => (typeof x === 'string' ? x : ''))
      .filter((u: string) => u.startsWith('http') && !u.includes('placeimg') && !u.includes('picsum'))
    const good: string[] = []
    for (const img of raw) {
      if (usedImages.has(img)) continue
      if (await urlOk(img)) good.push(img)
    }
    if (!good.length) continue
    pool.push({
      name,
      short: name,
      description: p.description || name,
      images: good.slice(0, 4),
      source: `esc-${p.id}`,
    })
  }

  if (pool.length < need) {
    throw new Error(`Only ${pool.length} fill candidates, need ${need}`)
  }

  const selected = pool.slice(0, need)
  const runTag = Date.now().toString(36)
  console.log(`Inserting ${selected.length} Lifestyle products...`)

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const primary = item.images.find((u) => !usedImages.has(u))
    if (!primary) throw new Error(`no unique image for ${item.name}`)
    usedImages.add(primary)
    usedNames.add(item.name.toLowerCase())

    // Prices > $300, spread ~$320–$1800
    const saleTarget = round2(320 + ((i * 37) % 1480))
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
        sku: `LS-F-${String(i + 1).padStart(3, '0')}-${runTag}`,
        stock: 15 + (i % 30),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 5,
        isPromoted: i % 6 === 0,
        rating: round2(3.9 + (i % 10) * 0.1),
        totalReviews: 5 + (i % 30),
        totalSales: i % 20,
        views: 30 + i * 4,
      })
      .select('id')
      .single()
    if (error || !product) throw error || new Error('insert failed')

    const rows = [primary, ...item.images.filter((u) => u !== primary)].slice(0, 4).map((url, idx) => ({
      productId: product.id,
      url,
      alt: item.name,
      sortOrder: idx,
      isPrimary: idx === 0,
    }))
    usedImages.add(rows[0].url)
    const { error: imgErr } = await supabase.from('product_images').insert(rows)
    if (imgErr) throw imgErr

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
