/**
 * Rebuild Men's Shoes with matched store photos (DummyJSON + Escuela).
 * Uses unique product + gallery frames only — no loremflickr/picsum.
 * Price bands span $300–$5000 (scaled if under 50).
 *
 * Run: npx tsx scripts/rebuild-men-shoes-store-images.ts
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

const CAT_SLUG = 'men-shoes'
const LIFE_SLUG = 'lifestyle'
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
  return /heel|pump|sandal|espadrille|glitter|peep-toe|stiletto|women|woman|lady/i.test(name)
}

async function loadCatalog(): Promise<Item[]> {
  const items: Item[] = []
  const seenName = new Set<string>()
  const seenImg = new Set<string>()

  const dj = (await (await fetch('https://dummyjson.com/products/category/mens-shoes')).json()) as {
    products: any[]
  }

  // ONE listing per base product — extra images go on the same product gallery only.
  // Do NOT create Core/Pro/Street clones from alternate angles.
  for (const p of dj.products || []) {
    const base = String(p.title).trim()
    if (!base) continue
    // Skip near-duplicate DummyJSON twin
    if (/sports sneakers off white red$/i.test(base)) continue
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
    if (!good.length || seenName.has(base.toLowerCase())) continue
    seenName.add(base.toLowerCase())
    seenImg.add(good[0])
    for (const g of good.slice(1, 4)) seenImg.add(g)
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
    if (isWomensShoeTitle(name)) continue
    if (seenName.has(name.toLowerCase())) continue
    const catOk =
      p?.category?.name === 'Shoes' ||
      /sneaker|cleat|loafer|boot|runner|shoe|high-top/i.test(name)
    if (!catOk) continue
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
  if (!cat) throw new Error('men-shoes missing')
  const { data: life } = await supabase.from('categories').select('id').eq('slug', LIFE_SLUG).single()
  if (!life) throw new Error('lifestyle missing')

  const catalog = await loadCatalog()
  console.log(`Matched men's shoe frames: ${catalog.length}`)
  if (catalog.length < 8) throw new Error('too few shoe products')

  // Reclaim overlapping titles from Lifestyle (base names + editions)
  const reclaimKeys = new Set<string>()
  for (const c of catalog) {
    reclaimKeys.add(c.name.toLowerCase())
    // also reclaim bare DummyJSON titles sitting in lifestyle
    const base = c.name.replace(/\s+(Core|Pro|Street|Trail|Match|Studio|Classic|Elite)(\s+\d+)?$/i, '')
    reclaimKeys.add(base.toLowerCase())
  }
  const { data: lifeRows } = await supabase.from('products').select('id, name').eq('categoryId', life.id)
  const lifeRemove = (lifeRows || []).filter((p) => reclaimKeys.has(p.name.toLowerCase()))
  console.log(`Removing ${lifeRemove.length} from Lifestyle...`)
  for (let i = 0; i < lifeRemove.length; i += 40) {
    const chunk = lifeRemove.slice(i, i + 40).map((p) => p.id)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    const blocked = new Set((oi || []).map((x) => x.productId))
    const safe = chunk.filter((id) => !blocked.has(id))
    if (!safe.length) continue
    await supabase.from('product_images').delete().in('productId', safe)
    await supabase.from('products').delete().in('id', safe)
  }

  // Also strip any lifestyle product whose primary image we will use
  const catalogImgs = new Set(catalog.map((c) => c.images[0]))
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
    console.log(`Removed ${safe.length} Lifestyle rows with colliding shoe images`)
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

  // Skip images already used elsewhere on the site
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
  const need = total - keep.size
  const selected = available.slice(0, need)
  console.log(`Inserting ${selected.length} (total ${total})...`)

  const prices = buildPrices(total)
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
  let inserted = 0

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const primary = item.images[0]
    if (usedImages.has(primary)) continue
    usedImages.add(primary)

    const sale = prices[keep.size + inserted]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `ms-${slugify(item.name)}-${runTag}-${inserted + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `MS-${String(inserted + 1).padStart(3, '0')}-${runTag}`,
        stock: 12 + (inserted % 40),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: inserted < 6,
        isPromoted: inserted % 5 === 0,
        rating: round2(3.9 + (inserted % 10) * 0.1),
        totalReviews: 8 + (inserted % 40),
        totalSales: inserted % 25,
        views: 40 + inserted * 5,
      })
      .select('id')
      .single()
    if (error || !product) throw error || new Error('insert failed')

    await supabase.from('product_images').insert({
      productId: product.id,
      url: primary,
      alt: item.name,
      sortOrder: 0,
      isPrimary: true,
    })

    preview.push(
      [inserted + 1, `"${item.name.replace(/"/g, '""')}"`, saleNorm, primary, item.source].join(',')
    )
    inserted++
    if (inserted % 10 === 0) console.log(`  … ${inserted}`)
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
  const pricesOut = (priced || []).map((p) => Number(p.price))
  const urls = (imgs || []).map((i) => i.url)
  const lifeCount = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', life.id)
    .eq('status', 'PUBLISHED')

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'men-shoes-store-images.csv'), preview.join('\n'))

  console.log('\n=== Men\'s Shoes rebuild ===')
  console.log('Products', names.length, 'unique names', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Unique images', new Set(urls).size)
  console.log('Price min/max', Math.min(...pricesOut), Math.max(...pricesOut))
  for (const b of PRICE_BAND_TEMPLATE) {
    const n =
      b.min === 300
        ? pricesOut.filter((p) => p >= 300 && p <= 800).length
        : pricesOut.filter((p) => p > b.min && p <= b.max).length
    console.log(`  ${b.min}-${b.max}: ${n}`)
  }
  console.log('Lifestyle ~', lifeCount.count)
  for (const p of (priced || []).slice(0, 6)) {
    const img = (imgs || []).find((i) => i.productId === p.id)
    console.log(` - ${p.name} $${p.price}`)
    console.log(`   ${img?.url}`)
  }

  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error('dup names')
  if (new Set(urls).size !== urls.length) throw new Error('dup images')
  if (urls.some((u) => /loremflickr|picsum/i.test(u))) throw new Error('random stock')
  if (names.length < 10) throw new Error('too few')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
