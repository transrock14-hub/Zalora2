/**
 * Rebuild Girls — ONE product each (no angle clones).
 * Uses girl/frock styles moved from Women's Clothing + pink kids sneakers.
 *
 * Run: npx tsx scripts/rebuild-girls-store-images.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: (i, init) => fetch(i, { ...init, cache: 'no-store' }) } }
)

const CAT_SLUG = 'girls'
const PRICE_BAND_TEMPLATE = [
  { min: 300, max: 800 },
  { min: 800, max: 2500 },
  { min: 2500, max: 3000 },
  { min: 3000, max: 4000 },
  { min: 4000, max: 5000 },
]

/** Titles that belong in Girls rather than Women's Clothing / Men Shoes */
const GIRLS_TITLES = new Set([
  'girl summer dress',
  'blue frock',
  'short frock',
  'vibrant pink classic sneakers',
])

const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)

type Item = { name: string; short: string; description: string; images: string[]; source: string }

async function urlOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, redirect: 'follow' })
    clearTimeout(t)
    const ct = res.headers.get('content-type') || ''
    return res.ok && ct.startsWith('image/')
  } catch {
    return false
  }
}

function buildPrices(count: number): number[] {
  const base = Math.floor(count / PRICE_BAND_TEMPLATE.length)
  let rem = count % PRICE_BAND_TEMPLATE.length
  const prices: number[] = []
  for (const band of PRICE_BAND_TEMPLATE) {
    const n = base + (rem > 0 ? 1 : 0)
    if (rem > 0) rem--
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const lo = band.min === 300 ? 305 : band.min + 1
      prices.push(round2(lo + (band.max - lo) * t))
    }
  }
  return prices
}

async function loadCatalog(): Promise<Item[]> {
  const items: Item[] = []
  const seen = new Set<string>()
  const seenImg = new Set<string>()

  const push = async (p: any, source: string) => {
    const name = String(p.title || p.name || '').trim()
    if (!name || !GIRLS_TITLES.has(name.toLowerCase())) return
    if (seen.has(name.toLowerCase())) return
    const imgs = Array.from(
      new Set([...(p.images || []), p.thumbnail, p.image].filter(Boolean) as string[])
    )
    const good: string[] = []
    for (const img of imgs) {
      if (/loremflickr|picsum|placehold|pravatar/i.test(img)) continue
      if (seenImg.has(img)) continue
      if (!(await urlOk(img))) continue
      good.push(img)
    }
    if (!good.length) return
    seen.add(name.toLowerCase())
    for (const g of good.slice(0, 4)) seenImg.add(g)
    items.push({
      name,
      short: p.brand ? `${p.brand} · ${name}` : name,
      description: p.description || name,
      images: good.slice(0, 4),
      source,
    })
  }

  for (const cat of ['tops', 'womens-dresses']) {
    const dj = await (await fetch(`https://dummyjson.com/products/category/${cat}`)).json()
    for (const p of dj.products || []) await push(p, `dj-${p.id}`)
  }

  const esc = await (await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=200')).json()
  for (const p of esc || []) await push({ ...p, title: p.title }, `esc-${p.id}`)

  return items
}

async function deleteByTitles(slugs: string[], titles: Set<string>) {
  for (const slug of slugs) {
    const { data: c } = await supabase.from('categories').select('id').eq('slug', slug).single()
    if (!c) continue
    const { data: rows } = await supabase.from('products').select('id, name').eq('categoryId', c.id)
    const hit = (rows || []).filter((p) => titles.has(p.name.toLowerCase()))
    if (!hit.length) continue
    const ids = hit.map((p) => p.id)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', ids)
    const blocked = new Set((oi || []).map((x) => x.productId))
    const safe = ids.filter((id) => !blocked.has(id))
    if (!safe.length) continue
    await supabase.from('product_images').delete().in('productId', safe)
    await supabase.from('products').delete().in('id', safe)
    console.log(`Reclaimed ${safe.length} from ${slug}`)
  }
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', CAT_SLUG).single()
  if (!cat) throw new Error('girls missing')

  const catalog = await loadCatalog()
  console.log('Girls catalog', catalog.length, catalog.map((c) => c.name))

  await deleteByTitles(['women-clothing', 'men-shoes', 'lifestyle'], GIRLS_TITLES)

  const { data: existing } = await supabase.from('products').select('id').eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    await supabase.from('products').delete().in('id', chunk)
  }

  const { data: allP } = await supabase.from('products').select('id')
  const used = new Set<string>()
  const allIds = (allP || []).map((p) => p.id)
  for (let i = 0; i < allIds.length; i += 60) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', allIds.slice(i, i + 60))
    for (const r of imgs || []) used.add(r.url)
  }

  const selected = catalog.filter((c) => !used.has(c.images[0]))
  const prices = buildPrices(Math.max(selected.length, 1))
  const runTag = Date.now().toString(36)
  const preview = ['index,name,price,image']

  console.log(`Inserting ${selected.length}...`)
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const gallery = item.images.filter((u) => !used.has(u)).slice(0, 4)
    if (!gallery.length) continue
    for (const g of gallery) used.add(g)

    const sale = prices[i]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `girls-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `GL-${String(i + 1).padStart(3, '0')}-${runTag}`,
        stock: 15 + (i % 20),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 2,
        isPromoted: i === 0,
        rating: round2(4.0 + (i % 5) * 0.1),
        totalReviews: 6 + i * 2,
        totalSales: i % 8,
        views: 30 + i * 8,
      })
      .select('id')
      .single()
    if (error || !product) throw error || new Error('insert failed')

    await supabase.from('product_images').insert(
      gallery.map((url, idx) => ({
        productId: product.id,
        url,
        alt: item.name,
        sortOrder: idx,
        isPrimary: idx === 0,
      }))
    )
    preview.push([i + 1, `"${item.name.replace(/"/g, '""')}"`, saleNorm, gallery[0]].join(','))
  }

  const { data: priced } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const { data: pi } = await supabase
    .from('product_images')
    .select('url')
    .in(
      'productId',
      (priced || []).map((p) => p.id)
    )
    .eq('isPrimary', true)

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'girls-store-images.csv'), preview.join('\n'))

  console.log('\n=== Girls rebuild ===')
  console.log('Products', priced?.length, 'unique images', new Set((pi || []).map((x) => x.url)).size)
  for (const p of priced || []) console.log(` - ${p.name} $${p.price}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
