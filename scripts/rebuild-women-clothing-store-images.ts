/**
 * Rebuild Women's Clothing — ONE product each (no Core/Pro clones).
 * DummyJSON tops + womens-dresses + FakeStore women's clothing.
 *
 * Run: npx tsx scripts/rebuild-women-clothing-store-images.ts
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

const CAT_SLUG = 'women-clothing'
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

async function loadCatalog(): Promise<Item[]> {
  const items: Item[] = []
  const seenName = new Set<string>()
  const seenImg = new Set<string>()

  const push = async (p: {
    name: string
    short?: string
    description?: string
    images: string[]
    source: string
  }) => {
    const name = p.name.trim()
    if (!name || seenName.has(name.toLowerCase())) return
    const good: string[] = []
    for (const img of p.images) {
      if (!img || !img.startsWith('http')) continue
      if (/loremflickr|picsum|placeimg|pravatar|placehold/i.test(img)) continue
      if (seenImg.has(img)) continue
      if (!(await urlOk(img))) continue
      good.push(img)
    }
    if (!good.length) return
    seenName.add(name.toLowerCase())
    for (const g of good.slice(0, 4)) seenImg.add(g)
    items.push({
      name,
      short: p.short || name,
      description: p.description || name,
      images: good.slice(0, 4),
      source: p.source,
    })
  }

  for (const cat of ['tops', 'womens-dresses']) {
    const dj = (await (await fetch(`https://dummyjson.com/products/category/${cat}`)).json()) as {
      products: any[]
    }
    for (const p of dj.products || []) {
      await push({
        name: String(p.title).trim(),
        short: p.brand ? `${p.brand} · ${p.title}` : p.title,
        description: p.description || p.title,
        images: [...(p.images || []), p.thumbnail].filter(Boolean),
        source: `dj-${p.id}`,
      })
    }
  }

  const fs = (await (await fetch('https://fakestoreapi.com/products')).json()) as any[]
  for (const p of fs || []) {
    if (p.category !== "women's clothing") continue
    await push({
      name: String(p.title).trim(),
      description: p.description || p.title,
      images: [p.image],
      source: `fs-${p.id}`,
    })
  }

  return items
}

async function reclaim(slug: string, keys: Set<string>, imgs: Set<string>) {
  const { data: c } = await supabase.from('categories').select('id').eq('slug', slug).single()
  if (!c) return 0
  const { data: rows } = await supabase.from('products').select('id, name').eq('categoryId', c.id)
  const byName = (rows || []).filter((p) => keys.has(p.name.toLowerCase())).map((p) => p.id)
  const ids = (rows || []).map((p) => p.id)
  const byImg: string[] = []
  for (let i = 0; i < ids.length; i += 40) {
    const { data: pi } = await supabase
      .from('product_images')
      .select('url, productId')
      .in('productId', ids.slice(i, i + 40))
      .eq('isPrimary', true)
    for (const r of pi || []) if (imgs.has(r.url)) byImg.push(r.productId)
  }
  const targets = Array.from(new Set([...byName, ...byImg]))
  if (!targets.length) return 0
  const { data: oi } = await supabase.from('order_items').select('productId').in('productId', targets)
  const blocked = new Set((oi || []).map((x) => x.productId))
  const safe = targets.filter((id) => !blocked.has(id))
  if (!safe.length) return 0
  await supabase.from('product_images').delete().in('productId', safe)
  await supabase.from('products').delete().in('id', safe)
  return safe.length
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', CAT_SLUG).single()
  if (!cat) throw new Error('women-clothing missing')
  const { data: life } = await supabase.from('categories').select('id').eq('slug', LIFE_SLUG).single()
  if (!life) throw new Error('lifestyle missing')

  const catalog = await loadCatalog()
  console.log(`Unique womens clothing: ${catalog.length}`)
  if (catalog.length < 5) throw new Error('too few')

  const keys = new Set(catalog.map((c) => c.name.toLowerCase()))
  const imgs = new Set(catalog.flatMap((c) => c.images))
  console.log(`Reclaimed Lifestyle ${await reclaim(LIFE_SLUG, keys, imgs)}`)

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

  const toDelete = ids.filter((id) => !keep.has(id))
  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    await supabase.from('products').delete().in('id', chunk)
  }
  console.log('Deleted old', toDelete.length, 'keep', keep.size)

  const { data: allP } = await supabase.from('products').select('id')
  const usedImages = new Set<string>()
  const allIds = (allP || []).map((p) => p.id)
  for (let i = 0; i < allIds.length; i += 60) {
    const { data: pi } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', allIds.slice(i, i + 60))
    for (const r of pi || []) usedImages.add(r.url)
  }

  const available = catalog.filter((c) => !usedImages.has(c.images[0]))
  const total = Math.min(TARGET, keep.size + available.length)
  const selected = available.slice(0, total - keep.size)
  const prices = buildPrices(Math.max(total, selected.length))
  console.log(`Inserting ${selected.length}...`)

  const runTag = Date.now().toString(36)
  const preview = ['index,name,price,image,source']
  let inserted = 0

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const gallery = item.images.filter((u) => !usedImages.has(u)).slice(0, 4)
    if (!gallery.length) continue
    for (const g of gallery) usedImages.add(g)

    const sale = prices[inserted]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `wc-${slugify(item.name)}-${runTag}-${inserted + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `WC-${String(inserted + 1).padStart(3, '0')}-${runTag}`,
        stock: 12 + (inserted % 40),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: inserted < 5,
        isPromoted: inserted % 4 === 0,
        rating: round2(3.9 + (inserted % 10) * 0.1),
        totalReviews: 8 + (inserted % 30),
        totalSales: inserted % 20,
        views: 40 + inserted * 5,
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
      [inserted + 1, `"${item.name.replace(/"/g, '""')}"`, saleNorm, gallery[0], item.source].join(',')
    )
    inserted++
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
  const { data: pi } = await supabase
    .from('product_images')
    .select('url, productId')
    .in(
      'productId',
      (priced || []).map((p) => p.id)
    )
    .eq('isPrimary', true)

  const names = (priced || []).map((p) => p.name)
  const urls = (pi || []).map((i) => i.url)
  const pricesOut = (priced || []).map((p) => Number(p.price))
  const lifeLeft = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', life.id)
    .eq('status', 'PUBLISHED')

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'women-clothing-store-images.csv'), preview.join('\n'))

  console.log('\n=== Womens Clothing rebuild ===')
  console.log('Products', names.length, 'unique', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Unique images', new Set(urls).size)
  console.log('Price min/max', Math.min(...pricesOut), Math.max(...pricesOut))
  for (const b of PRICE_BAND_TEMPLATE) {
    const n =
      b.min === 300
        ? pricesOut.filter((p) => p >= 300 && p <= 800).length
        : pricesOut.filter((p) => p > b.min && p <= b.max).length
    console.log(`  ${b.min}-${b.max}: ${n}`)
  }
  console.log('Lifestyle ~', lifeLeft.count)
  for (const p of (priced || []).slice(0, 8)) {
    const img = (pi || []).find((i) => i.productId === p.id)
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
