/**
 * Rebuild Men's Bags — ONE product each (no angle clones).
 * Sources are thin: FakeStore backpack + unisex travel luggage
 * (moved from Women's Bags). No loremflickr / Core-Pro clones.
 *
 * Run: npx tsx scripts/rebuild-men-bags-store-images.ts
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

const CAT_SLUG = 'men-bags'
const WOMEN_BAGS = 'women-bags'
const TARGET = 50
const PRICE_BAND_TEMPLATE = [
  { min: 300, max: 800 },
  { min: 800, max: 2500 },
  { min: 2500, max: 3000 },
  { min: 3000, max: 4000 },
  { min: 4000, max: 5000 },
]

/** Unisex travel piece that fits Men's Bags better than handbags */
const MOVE_FROM_WOMEN = new Set(['sleek olive green hardshell carry-on luggage'])

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

async function loadCatalog(blockedImgs: Set<string>): Promise<Item[]> {
  const items: Item[] = []
  const seenName = new Set<string>()
  const seenImg = new Set<string>(blockedImgs)

  const push = async (p: {
    name: string
    short?: string
    description?: string
    images: string[]
    source: string
  }) => {
    const name = p.name.trim()
    if (!name || seenName.has(name.toLowerCase())) return
    if (/women|woman|handbag|prada women|heshe|chic transparent/i.test(name)) return
    if (/test|^string$|arie bagas|placehold/i.test(name)) return
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

  const fs = (await (await fetch('https://fakestoreapi.com/products')).json()) as any[]
  for (const p of fs || []) {
    if (!/backpack/i.test(p.title)) continue
    await push({
      name: String(p.title).trim(),
      description: p.description || p.title,
      images: [p.image],
      source: `fs-${p.id}`,
    })
  }

  const esc = (await (
    await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=200')
  ).json()) as any[]
  for (const p of esc || []) {
    const name = String(p.title || '').trim()
    if (!/luggage|briefcase|duffel|messenger|backpack|travel bag|laptop bag/i.test(name)) continue
    if (/handbag|women|woman/i.test(name)) continue
    await push({
      name,
      description: p.description || name,
      images: (p.images || []).map((x: any) => (typeof x === 'string' ? x : '')).filter(Boolean),
      source: `esc-${p.id}`,
    })
  }

  return items
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', CAT_SLUG).single()
  if (!cat) throw new Error('men-bags missing')
  const { data: women } = await supabase.from('categories').select('id').eq('slug', WOMEN_BAGS).single()

  const blockedImgs = new Set<string>()
  const blockedNames = new Set<string>()
  if (women) {
    const { data: wrows } = await supabase.from('products').select('id, name').eq('categoryId', women.id)
    // Move unisex luggage into men's bags
    const toMove = (wrows || []).filter((p) => MOVE_FROM_WOMEN.has(p.name.toLowerCase()))
    for (const p of toMove) {
      const { data: oi } = await supabase.from('order_items').select('id').eq('productId', p.id).limit(1)
      if (oi?.length) continue
      await supabase.from('product_images').delete().eq('productId', p.id)
      await supabase.from('products').delete().eq('id', p.id)
      console.log('Moved (deleted for rebuild):', p.name)
    }
    const { data: remain } = await supabase.from('products').select('id, name').eq('categoryId', women.id)
    for (const p of remain || []) blockedNames.add(p.name.toLowerCase())
    const wids = (remain || []).map((p) => p.id)
    for (let i = 0; i < wids.length; i += 40) {
      const { data: imgs } = await supabase
        .from('product_images')
        .select('url')
        .in('productId', wids.slice(i, i + 40))
      for (const r of imgs || []) blockedImgs.add(r.url)
    }
  }

  const catalog = await loadCatalog(blockedImgs)
  // Also drop anything still blocked by women-bag names
  const filtered = catalog.filter((c) => !blockedNames.has(c.name.toLowerCase()))
  if (filtered.length < 1) throw new Error('no mens bag products available')
  console.log(`Unique mens bags: ${filtered.length}`)

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

  const { data: allP } = await supabase.from('products').select('id')
  const usedImages = new Set<string>(blockedImgs)
  const allIds = (allP || []).map((p) => p.id)
  for (let i = 0; i < allIds.length; i += 60) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', allIds.slice(i, i + 60))
    for (const r of imgs || []) usedImages.add(r.url)
  }

  const available = filtered.filter((c) => !usedImages.has(c.images[0]))
  const total = Math.min(TARGET, keep.size + available.length)
  const selected = available.slice(0, total - keep.size)
  const prices = buildPrices(Math.max(total, selected.length || 1))
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
        slug: `mb-${slugify(item.name)}-${runTag}-${inserted + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `MB-${String(inserted + 1).padStart(3, '0')}-${runTag}`,
        stock: 12 + (inserted % 40),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: inserted < 2,
        isPromoted: inserted === 0,
        rating: round2(4.0 + (inserted % 5) * 0.1),
        totalReviews: 8 + inserted * 3,
        totalSales: inserted % 10,
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

  const { data: priced } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
    .order('name')

  const finalPrices = buildPrices((priced || []).length)
  for (let i = 0; i < (priced || []).length; i++) {
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
      .eq('id', priced![i].id)
  }

  const { data: refreshed } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const { data: pi } = await supabase
    .from('product_images')
    .select('url, productId')
    .in(
      'productId',
      (refreshed || []).map((p) => p.id)
    )
    .eq('isPrimary', true)

  const { data: wcount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', women!.id)
    .eq('status', 'PUBLISHED')

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'men-bags-store-images.csv'), preview.join('\n'))

  const names = (refreshed || []).map((p) => p.name)
  const urls = (pi || []).map((i) => i.url)
  const pricesOut = (refreshed || []).map((p) => Number(p.price))

  console.log("\n=== Men's Bags rebuild ===")
  console.log('Products', names.length, 'unique images', new Set(urls).size)
  console.log('Price min/max', Math.min(...pricesOut), Math.max(...pricesOut))
  console.log('Women bags remaining ~', wcount)
  for (const p of refreshed || []) {
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
