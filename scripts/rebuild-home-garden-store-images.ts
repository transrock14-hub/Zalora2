/**
 * Rebuild Home & Garden with Amazon/Shein-style product photos:
 * - DummyJSON / Escuela images where title matches the photo
 * - No loremflickr / random stock
 * - No image reuse, no "Photo N" clones
 * - Price bands: 10×($300–800), 10×($800–2500), 10×($2500–3000),
 *   10×($3000–4000), 10×($4000–5000)  → 50 products
 *
 * Also removes overlapping kitchen/furniture/home-deco listings from Lifestyle
 * so the real product photos can live in Home & Garden.
 *
 * Run: npx tsx scripts/rebuild-home-garden-store-images.ts
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

const HG_SLUG = 'home-garden'
const LIFE_ID = 'a6bbf30c-2517-4175-b215-575e96afeacd'
const DJ_CATS = new Set(['home-decoration', 'furniture', 'kitchen-accessories'])
/** Extra pantry/home staples with real DummyJSON product photos */
const EXTRA_DJ_TITLES = new Set([
  'Honey Jar',
  'Cooking Oil',
  'Rice',
])

const TARGET = 50
const PRICE_BANDS: Array<{ min: number; max: number; count: number }> = [
  { min: 300, max: 800, count: 10 },
  { min: 800, max: 2500, count: 10 },
  { min: 2500, max: 3000, count: 10 },
  { min: 3000, max: 4000, count: 10 },
  { min: 4000, max: 5000, count: 10 },
]

const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)

type Item = {
  name: string
  short: string
  description: string
  images: string[]
  source: string
}

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

function buildPrices(n: number): number[] {
  const prices: number[] = []
  for (const band of PRICE_BANDS) {
    for (let i = 0; i < band.count; i++) {
      const t = band.count === 1 ? 0.5 : i / (band.count - 1)
      // stay inside (min, max] with min strictly > 300 for first band edge
      const lo = band.min === 300 ? 305 : band.min + 1
      const hi = band.max
      prices.push(round2(lo + (hi - lo) * t))
    }
  }
  if (prices.length !== TARGET) {
    throw new Error(`Price band total ${prices.length} != ${TARGET}`)
  }
  // If we have fewer products, caller slices; if more, we only use TARGET prices
  return prices.slice(0, n)
}

async function loadStoreCatalog(): Promise<Item[]> {
  const items: Item[] = []
  const seen = new Set<string>()

  const djRes = await fetch('https://dummyjson.com/products?limit=200')
  const dj = (await djRes.json()) as { products: any[] }
  for (const p of dj.products || []) {
    const allowed = DJ_CATS.has(p.category) || EXTRA_DJ_TITLES.has(String(p.title).trim())
    if (!allowed) continue
    const name = String(p.title).trim()
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    const images = Array.from(
      new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
    )
    const good: string[] = []
    for (const img of images) {
      if (await urlOk(img)) good.push(img)
    }
    if (!good.length) continue
    seen.add(key)
    items.push({
      name,
      short: p.brand ? `${p.brand} · ${name}` : name,
      description: p.description || name,
      images: good.slice(0, 5),
      source: `dj-${p.id}`,
    })
  }

  const escRes = await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=100')
  const esc = (await escRes.json()) as any[]
  for (const p of esc || []) {
    const catName = p?.category?.name || ''
    if (catName !== 'Furniture') continue
    const name = String(p.title || '').trim()
    if (!name || /test/i.test(name)) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    const rawImgs = (p.images || [])
      .map((x: any) => (typeof x === 'string' ? x : ''))
      .filter((u: string) => u.startsWith('http') && !u.includes('placeimg') && !u.includes('picsum'))
    const good: string[] = []
    for (const img of rawImgs) {
      if (await urlOk(img)) good.push(img)
    }
    if (!good.length) continue
    seen.add(key)
    items.push({
      name,
      short: name,
      description: p.description || name,
      images: good.slice(0, 5),
      source: `esc-${p.id}`,
    })
  }

  return items
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', HG_SLUG).single()
  if (!cat) throw new Error('Home & Garden missing')

  // 1) Free DummyJSON home products currently trapped in Lifestyle
  const catalogPreview = await loadStoreCatalog()
  const homeNames = new Set(catalogPreview.map((c) => c.name.toLowerCase()))

  const { data: lifeRows } = await supabase
    .from('products')
    .select('id, name')
    .eq('categoryId', LIFE_ID)
  const lifeRemove = (lifeRows || []).filter((p) => homeNames.has(p.name.toLowerCase()))
  console.log(`Removing ${lifeRemove.length} home/kitchen items from Lifestyle (reclaim photos)...`)
  for (let i = 0; i < lifeRemove.length; i += 40) {
    const chunk = lifeRemove.slice(i, i + 40).map((p) => p.id)
    // safety: skip if ordered
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    const blocked = new Set((oi || []).map((x) => x.productId))
    const safe = chunk.filter((id) => !blocked.has(id))
    if (!safe.length) continue
    await supabase.from('product_images').delete().in('productId', safe)
    await supabase.from('products').delete().in('id', safe)
  }

  // 2) Keep HG order-linked; delete other HG
  const { data: existing } = await supabase.from('products').select('id, name').eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  const keep = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    for (const r of oi || []) keep.add(r.productId)
  }
  console.log('Keep HG (orders)', keep.size)

  const toDelete = ids.filter((id) => !keep.has(id))
  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    const { error } = await supabase.from('products').delete().in('id', chunk)
    if (error) throw error
  }
  console.log('Deleted old HG', toDelete.length)

  const catalog = await loadStoreCatalog()
  // Exclude names already kept
  const { data: keptRows } = await supabase.from('products').select('name').eq('categoryId', cat.id)
  const exclude = new Set((keptRows || []).map((p) => p.name.toLowerCase()))
  const pool = catalog.filter((c) => !exclude.has(c.name.toLowerCase()))

  const need = TARGET - keep.size
  if (pool.length < need) {
    throw new Error(`Only ${pool.length} matched store products available, need ${need}`)
  }

  // Prefer mix: furniture/home-deco first, then kitchen
  const preferred = [
    ...pool.filter((p) => /table|chair|sofa|bed|lamp|plant|frame|decoration|swing/i.test(p.name)),
    ...pool.filter((p) => !/table|chair|sofa|bed|lamp|plant|frame|decoration|swing/i.test(p.name)),
  ]
  // unique preserve order
  const seen = new Set<string>()
  const ordered: Item[] = []
  for (const p of preferred) {
    if (seen.has(p.name.toLowerCase())) continue
    seen.add(p.name.toLowerCase())
    ordered.push(p)
  }
  const selected = ordered.slice(0, need)

  const prices = buildPrices(TARGET)
  // Keep-order products take the first price slots so bands stay exact (10 each)
  const keepIds = Array.from(keep)
  for (let ki = 0; ki < keepIds.length; ki++) {
    const sale = prices[ki]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)
    await supabase
      .from('products')
      .update({
        price: saleNorm,
        salePrice: saleNorm,
        wholesalePrice: wholesale,
        costPrice: wholesale,
        comparePrice: round2(saleNorm * 1.12),
        status: 'PUBLISHED',
      })
      .eq('id', keepIds[ki])
  }
  const insertPrices = prices.slice(keep.size)

  const usedImages = new Set<string>()
  const runTag = Date.now().toString(36)
  const preview = ['index,name,price,image,source']

  console.log(`Inserting ${selected.length} store-matched Home & Garden products...`)
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const imgs = item.images.filter((u) => !usedImages.has(u))
    if (!imgs.length) throw new Error(`No unique image for ${item.name}`)
    usedImages.add(imgs[0])
    for (const extra of imgs.slice(1, 4)) usedImages.add(extra)

    const sale = insertPrices[i]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `hg-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `HG-${String(i + 1).padStart(3, '0')}-${runTag}`,
        stock: 12 + (i % 40),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 8,
        isPromoted: i % 5 === 0,
        rating: round2(3.9 + (i % 10) * 0.1),
        totalReviews: 8 + (i % 40),
        totalSales: i % 25,
        views: 40 + i * 5,
      })
      .select('id')
      .single()
    if (error || !product) throw error || new Error('insert failed')

    const rows = imgs.slice(0, 4).map((url, idx) => ({
      productId: product.id,
      url,
      alt: item.name,
      sortOrder: idx,
      isPrimary: idx === 0,
    }))
    const { error: imgErr } = await supabase.from('product_images').insert(rows)
    if (imgErr) throw imgErr

    preview.push(
      [i + 1, `"${item.name.replace(/"/g, '""')}"`, saleNorm, imgs[0], item.source].join(',')
    )
    if ((i + 1) % 10 === 0) console.log(`  … ${i + 1}/${need}`)
  }

  const { data: final } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')

  const { data: imgs } = await supabase
    .from('product_images')
    .select('url, productId, isPrimary')
    .in(
      'productId',
      (final || []).map((p) => p.id)
    )
    .eq('isPrimary', true)

  const names = (final || []).map((p) => p.name)
  const pricesOut = (final || []).map((p) => Number(p.price))
  const primaryUrls = (imgs || []).map((i) => i.url)
  const lifeLeft = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', LIFE_ID)
    .eq('status', 'PUBLISHED')

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'home-garden-store-images.csv'), preview.join('\n'))

  console.log('\n=== Home & Garden store-images rebuild ===')
  console.log('Products', names.length, 'unique names', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Unique primary images', new Set(primaryUrls).size)
  console.log('Price min/max', Math.min(...pricesOut), Math.max(...pricesOut))
  console.log('Bands approx:')
  for (const b of PRICE_BANDS) {
    const n = pricesOut.filter((p) => p > b.min && p <= b.max).length
    console.log(`  ${b.min}-${b.max}: ${n}`)
  }
  console.log('Lifestyle remaining published ~', lifeLeft.count)
  console.log('Samples:')
  for (const p of (final || []).slice(0, 8)) {
    const img = (imgs || []).find((i) => i.productId === p.id)
    console.log(` - ${p.name} $${p.price}`)
    console.log(`   ${img?.url}`)
  }

  if (names.length < TARGET) throw new Error('under target')
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error('dup names')
  if (new Set(primaryUrls).size !== primaryUrls.length) throw new Error('dup images')
  if (primaryUrls.some((u) => u.includes('loremflickr') || u.includes('picsum'))) {
    throw new Error('random stock still present')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
