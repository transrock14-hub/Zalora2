/**
 * Rebuild Women's Shoes — ONE product per shoe (no Core/Pro angle clones).
 * DummyJSON womens-shoes + Escuela women's footwear. Gallery stays on same SKU.
 *
 * Run: npx tsx scripts/rebuild-women-shoes-store-images.ts
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

const CAT_SLUG = 'women-shoes'
const LIFE_SLUG = 'lifestyle'
const MEN_SLUG = 'men-shoes'
const TARGET = 50
const PRICE_BAND_TEMPLATE = [
  { min: 300, max: 800 },
  { min: 800, max: 2500 },
  { min: 2500, max: 3000 },
  { min: 3000, max: 4000 },
  { min: 4000, max: 5000 },
]

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

function isWomensShoeTitle(name: string) {
  return /heel|pump|sandal|espadrille|glitter|peep-toe|stiletto|slipper|woman|women/i.test(name)
}

async function loadCatalog(blockedNames: Set<string>, blockedImgs: Set<string>): Promise<Item[]> {
  const items: Item[] = []
  const seenName = new Set<string>(blockedNames)
  const seenImg = new Set<string>(blockedImgs)

  const dj = (await (await fetch('https://dummyjson.com/products/category/womens-shoes')).json()) as {
    products: any[]
  }
  for (const p of dj.products || []) {
    const base = String(p.title).trim()
    if (!base || seenName.has(base.toLowerCase())) continue
    const imgs = Array.from(
      new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
    )
    const good: string[] = []
    for (const img of imgs) {
      if (/loremflickr|picsum|placeimg|pravatar|placehold/i.test(img)) continue
      if (seenImg.has(img)) continue
      if (!(await urlOk(img))) continue
      good.push(img)
    }
    if (!good.length) continue
    seenName.add(base.toLowerCase())
    for (const g of good.slice(0, 4)) seenImg.add(g)
    items.push({
      name: base,
      short: p.brand ? `${p.brand} · ${base}` : base,
      description: p.description || base,
      images: good.slice(0, 4),
      source: `dj-${p.id}`,
    })
  }

  const esc = (await (
    await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=200')
  ).json()) as any[]
  for (const p of esc || []) {
    const name = String(p.title || '').trim()
    if (!name || /test|^string$|^shoes$|^\d+$/i.test(name)) continue
    if (!isWomensShoeTitle(name)) continue
    if (seenName.has(name.toLowerCase())) continue
    const raw = (p.images || [])
      .map((x: any) => (typeof x === 'string' ? x : ''))
      .filter(Boolean)
    const good: string[] = []
    for (const img of raw) {
      if (/loremflickr|picsum|placeimg|pravatar|placehold/i.test(img)) continue
      if (seenImg.has(img)) continue
      if (!(await urlOk(img))) continue
      good.push(img)
    }
    if (!good.length) continue
    seenName.add(name.toLowerCase())
    seenImg.add(good[0])
    items.push({
      name,
      short: name,
      description: p.description || name,
      images: good.slice(0, 4),
      source: `esc-${p.id}`,
    })
  }

  return items
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', CAT_SLUG).single()
  if (!cat) throw new Error('women-shoes missing')
  const { data: life } = await supabase.from('categories').select('id').eq('slug', LIFE_SLUG).single()
  if (!life) throw new Error('lifestyle missing')
  const { data: men } = await supabase.from('categories').select('id').eq('slug', MEN_SLUG).single()

  const blockedNames = new Set<string>()
  const blockedImgs = new Set<string>()
  if (men) {
    const { data: menP } = await supabase.from('products').select('id, name').eq('categoryId', men.id)
    for (const p of menP || []) blockedNames.add(p.name.toLowerCase())
    const menIds = (menP || []).map((p) => p.id)
    for (let i = 0; i < menIds.length; i += 40) {
      const { data: imgs } = await supabase
        .from('product_images')
        .select('url')
        .in('productId', menIds.slice(i, i + 40))
      for (const r of imgs || []) blockedImgs.add(r.url)
    }
  }

  const catalog = await loadCatalog(blockedNames, blockedImgs)
  console.log(`Unique women's shoes: ${catalog.length}`)
  if (catalog.length < 5) throw new Error('too few')

  const reclaimKeys = new Set(catalog.map((c) => c.name.toLowerCase()))
  const catalogImgs = new Set(catalog.flatMap((c) => c.images))

  const { data: lifeRows } = await supabase.from('products').select('id, name').eq('categoryId', life.id)
  const lifeRemove = (lifeRows || []).filter((p) => reclaimKeys.has(p.name.toLowerCase()))
  console.log(`Removing ${lifeRemove.length} from Lifestyle by name...`)
  for (let i = 0; i < lifeRemove.length; i += 40) {
    const chunk = lifeRemove.slice(i, i + 40).map((p) => p.id)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    const blocked = new Set((oi || []).map((x) => x.productId))
    const safe = chunk.filter((id) => !blocked.has(id))
    if (!safe.length) continue
    await supabase.from('product_images').delete().in('productId', safe)
    await supabase.from('products').delete().in('id', safe)
  }

  const { data: lifeLeft } = await supabase.from('products').select('id').eq('categoryId', life.id)
  const lifeIds = (lifeLeft || []).map((p) => p.id)
  for (let i = 0; i < lifeIds.length; i += 40) {
    const chunk = lifeIds.slice(i, i + 40)
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url, productId')
      .in('productId', chunk)
      .eq('isPrimary', true)
    const collide = (imgs || []).filter((r) => catalogImgs.has(r.url)).map((r) => r.productId)
    if (!collide.length) continue
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', collide)
    const blocked = new Set((oi || []).map((x) => x.productId))
    const safe = collide.filter((id) => !blocked.has(id))
    if (!safe.length) continue
    await supabase.from('product_images').delete().in('productId', safe)
    await supabase.from('products').delete().in('id', safe)
    console.log(`Removed ${safe.length} Lifestyle image collisions`)
  }

  const { data: existing } = await supabase.from('products').select('id').eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  const keep = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const { data: oi } = await supabase
      .from('order_items')
      .select('productId')
      .in('productId', ids.slice(i, i + 40))
    for (const r of oi || []) keep.add(r.productId)
  }
  console.log('Keep (orders)', keep.size)

  const toDelete = ids.filter((id) => !keep.has(id))
  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    await supabase.from('products').delete().in('id', chunk)
  }

  // Site-wide used images
  const { data: allP } = await supabase.from('products').select('id')
  const usedImages = new Set<string>()
  const allIds = (allP || []).map((p) => p.id)
  for (let i = 0; i < allIds.length; i += 60) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', allIds.slice(i, i + 60))
    for (const r of imgs || []) usedImages.add(r.url)
  }

  const available = catalog.filter((c) => !usedImages.has(c.images[0]))
  const total = Math.min(TARGET, keep.size + available.length)
  const selected = available.slice(0, total - keep.size)
  const prices = buildPrices(total)
  console.log(`Inserting ${selected.length} (total ${total})...`)

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

  const runTag = Date.now().toString(36)
  const preview = ['index,name,price,image,source']

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const gallery = item.images.filter((u) => !usedImages.has(u)).slice(0, 4)
    if (!gallery.length) continue
    for (const g of gallery) usedImages.add(g)

    const sale = prices[keep.size + i]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `ws-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `WS-${String(i + 1).padStart(3, '0')}-${runTag}`,
        stock: 12 + (i % 40),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 4,
        isPromoted: i % 4 === 0,
        rating: round2(3.9 + (i % 10) * 0.1),
        totalReviews: 8 + (i % 30),
        totalSales: i % 20,
        views: 40 + i * 5,
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

    preview.push(
      [i + 1, `"${item.name.replace(/"/g, '""')}"`, saleNorm, gallery[0], item.source].join(',')
    )
  }

  const { data: final } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
    .order('name')

  const finalPrices = buildPrices((final || []).length)
  for (let i = 0; i < (final || []).length; i++) {
    const sale = finalPrices[i]
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
      })
      .eq('id', final![i].id)
  }

  const { data: priced } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const { data: imgs } = await supabase
    .from('product_images')
    .select('url, productId')
    .in(
      'productId',
      (priced || []).map((p) => p.id)
    )
    .eq('isPrimary', true)

  const names = (priced || []).map((p) => p.name)
  const urls = (imgs || []).map((i) => i.url)
  const pricesOut = (priced || []).map((p) => Number(p.price))
  const lifeCount = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', life.id)
    .eq('status', 'PUBLISHED')

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'women-shoes-store-images.csv'), preview.join('\n'))

  console.log("\n=== Women's Shoes rebuild ===")
  console.log('Products', names.length, 'unique names', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Unique primary images', new Set(urls).size)
  console.log('Price min/max', Math.min(...pricesOut), Math.max(...pricesOut))
  for (const b of PRICE_BAND_TEMPLATE) {
    const n =
      b.min === 300
        ? pricesOut.filter((p) => p >= 300 && p <= 800).length
        : pricesOut.filter((p) => p > b.min && p <= b.max).length
    console.log(`  ${b.min}-${b.max}: ${n}`)
  }
  console.log('Lifestyle ~', lifeCount.count)
  for (const p of priced || []) {
    const img = (imgs || []).find((i) => i.productId === p.id)
    console.log(` - ${p.name} $${p.price}`)
    console.log(`   ${img?.url}`)
  }

  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error('dup names')
  if (new Set(urls).size !== urls.length) throw new Error('dup images')
  if (urls.some((u) => /loremflickr|picsum/i.test(u))) throw new Error('random stock')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
