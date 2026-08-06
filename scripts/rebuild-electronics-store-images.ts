/**
 * Rebuild Electronics with Amazon/Shein-style matched product photos.
 * Run: npx tsx scripts/rebuild-electronics-store-images.ts
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

const ELEC_SLUG = 'electronics'
const LIFE_SLUG = 'lifestyle'
const DJ_CATS = new Set(['smartphones', 'laptops', 'tablets', 'mobile-accessories'])
const ACC_OWNED = new Set([
  'Apple Airpods',
  'Apple AirPods Max Silver',
  'Beats Flex Wireless Earphones',
  'Apple Watch Series 4 Gold',
  'Apple MagSafe Battery Pack',
  'iPhone 12 Silicone Case with MagSafe Plum',
  'Apple Smartwatch',
])
const TARGET = 50
const PRICE_BAND_TEMPLATE: Array<{ min: number; max: number }> = [
  { min: 300, max: 800 },
  { min: 800, max: 2500 },
  { min: 2500, max: 3000 },
  { min: 3000, max: 4000 },
  { min: 4000, max: 5000 },
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

async function collectImages(urls: string[]): Promise<string[]> {
  const good: string[] = []
  for (const img of urls) {
    if (!img || !img.startsWith('http')) continue
    if (/loremflickr|picsum|placeimg|pravatar|placehold/i.test(img)) continue
    if (await urlOk(img)) good.push(img)
  }
  return good
}

async function loadStoreCatalog(): Promise<Item[]> {
  const items: Item[] = []
  const seen = new Set<string>()

  const push = async (p: {
    name: string
    short?: string
    description?: string
    images: string[]
    source: string
  }) => {
    const name = p.name.trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key) || ACC_OWNED.has(name)) return
    if (/^shoes$|^ssss$|^lily$|^test|^string$/i.test(name)) return
    const good = await collectImages(p.images)
    if (!good.length) return
    seen.add(key)
    items.push({
      name,
      short: p.short || name,
      description: p.description || name,
      images: good.slice(0, 5),
      source: p.source,
    })
  }

  const dj = (await (await fetch('https://dummyjson.com/products?limit=250')).json()) as {
    products: any[]
  }
  for (const p of dj.products || []) {
    if (!DJ_CATS.has(p.category)) continue
    const title = String(p.title || '').trim()
    if (ACC_OWNED.has(title)) continue
    await push({
      name: title,
      short: p.brand ? `${p.brand} · ${title}` : title,
      description: p.description || title,
      images: [...(p.images || []), p.thumbnail].filter(Boolean),
      source: `dj-${p.id}`,
    })
  }

  const fs = (await (await fetch('https://fakestoreapi.com/products')).json()) as any[]
  for (const p of fs || []) {
    if (p.category !== 'electronics') continue
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
  const escAllow =
    /phone|laptop|macbook|headphone|earbud|monitor|ssd|drive|tablet|charger|case|speaker|camera|keyboard|mouse|usb|hub|router|console/i
  for (const p of esc || []) {
    const name = String(p.title || '').trim()
    const catName = String(p?.category?.name || '')
    if (!name || /test|^string$|^shoes$|^ssss$/i.test(name)) continue
    if (ACC_OWNED.has(name) || /smartwatch|desk lamp|lamp/i.test(name)) continue
    if (!(/electr|computer/i.test(catName) || escAllow.test(name))) continue
    const raw = (p.images || [])
      .map((x: any) => (typeof x === 'string' ? x : ''))
      .filter(Boolean)
    await push({
      name,
      description: p.description || name,
      images: raw,
      source: `esc-${p.id}`,
    })
  }

  // Extra unique DummyJSON gallery frames only when product title already taken elsewhere —
  // instead: add vehicle-free fill from sports electronic-ish? skip.

  return items
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', ELEC_SLUG).single()
  if (!cat) throw new Error('Electronics missing')
  const { data: life } = await supabase.from('categories').select('id').eq('slug', LIFE_SLUG).single()
  if (!life) throw new Error('Lifestyle missing')

  const catalogPreview = await loadStoreCatalog()
  console.log(`Store catalog loaded: ${catalogPreview.length}`)
  const elecNames = new Set(catalogPreview.map((c) => c.name.toLowerCase()))

  const { data: lifeRows } = await supabase.from('products').select('id, name').eq('categoryId', life.id)
  const lifeRemove = (lifeRows || []).filter((p) => elecNames.has(p.name.toLowerCase()))
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

  const { data: existing } = await supabase.from('products').select('id, name').eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  const keep = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    for (const r of oi || []) keep.add(r.productId)
  }
  console.log('Keep (orders)', keep.size)

  const toDelete = ids.filter((id) => !keep.has(id))
  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    const { error } = await supabase.from('products').delete().in('id', chunk)
    if (error) throw error
  }
  console.log('Deleted', toDelete.length)

  const { data: keptRows } = await supabase.from('products').select('id, name').eq('categoryId', cat.id)
  const exclude = new Set((keptRows || []).map((p) => p.name.toLowerCase()))
  const pool = catalogPreview.filter((c) => !exclude.has(c.name.toLowerCase()))

  const rank = (name: string) => {
    if (/iphone|galaxy|pixel|vivo|oppo|samsung|macbook|laptop|ipad|tablet/i.test(name)) return 0
    if (/ssd|hard drive|monitor|acer|sandisk|wd /i.test(name)) return 1
    if (/airpod|headphone|earphone|speaker|homepod|echo/i.test(name)) return 2
    if (/charger|magsafe|case|hub|usb/i.test(name)) return 3
    return 4
  }
  const ordered = [...pool].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))

  // Unique by first available image URL
  const uniqueByPrimary: Item[] = []
  const primarySeen = new Set<string>()
  for (const item of ordered) {
    const first = item.images.find((u) => !primarySeen.has(u))
    if (!first) continue
    primarySeen.add(first)
    uniqueByPrimary.push({
      ...item,
      images: [first, ...item.images.filter((u) => u !== first)],
    })
  }

  const total = Math.min(TARGET, keep.size + uniqueByPrimary.length)
  const need = total - keep.size
  const selected = uniqueByPrimary.slice(0, need)
  const prices = buildPrices(total)
  const usedImages = new Set<string>()
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
        name: 'USB-C Multiport Hub',
        shortDesc: 'USB-C multiport hub',
        description: 'Compact USB-C multiport hub for laptops and tablets.',
      })
      .eq('id', keepIds[ki])
  }

  // Prefer Apple iPhone Charger gallery for hub keep
  const charger = uniqueByPrimary.find((p) => /iphone charger/i.test(p.name))
  for (let ki = 0; ki < keepIds.length; ki++) {
    const donor = charger || uniqueByPrimary.find((p) => /charger|airpower/i.test(p.name))
    if (!donor) continue
    const pick = donor.images.slice(1).find((u) => !usedImages.has(u)) || donor.images[0]
    if (!pick || usedImages.has(pick)) continue
    usedImages.add(pick)
    await supabase.from('product_images').delete().eq('productId', keepIds[ki])
    await supabase.from('product_images').insert({
      productId: keepIds[ki],
      url: pick,
      alt: 'USB-C Multiport Hub',
      sortOrder: 0,
      isPrimary: true,
    })
  }

  const insertPrices = prices.slice(keep.size)
  const runTag = Date.now().toString(36)
  const preview = ['index,name,price,image,source']
  let inserted = 0

  console.log(`Inserting up to ${selected.length} Electronics (target ${total})...`)
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const primary = item.images.find((u) => !usedImages.has(u))
    if (!primary) {
      console.warn(`skip: ${item.name}`)
      continue
    }
    usedImages.add(primary)
    const gallery = [primary, ...item.images.filter((u) => u !== primary && !usedImages.has(u))].slice(
      0,
      4
    )
    for (const g of gallery) usedImages.add(g)

    const sale = insertPrices[inserted] ?? insertPrices[insertPrices.length - 1]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `elec-${slugify(item.name)}-${runTag}-${inserted + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `EL-${String(inserted + 1).padStart(3, '0')}-${runTag}`,
        stock: 12 + (inserted % 40),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: inserted < 8,
        isPromoted: inserted % 5 === 0,
        rating: round2(3.9 + (inserted % 10) * 0.1),
        totalReviews: 8 + (inserted % 40),
        totalSales: inserted % 25,
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
      [inserted + 1, `"${item.name.replace(/"/g, '""')}"`, saleNorm, primary, item.source].join(',')
    )
    inserted++
    if (inserted % 10 === 0) console.log(`  … ${inserted}`)
  }

  // Rebalance prices if we inserted fewer than planned
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

  const { data: imgs } = await supabase
    .from('product_images')
    .select('url, productId')
    .in(
      'productId',
      (final || []).map((p) => p.id)
    )
    .eq('isPrimary', true)

  const { data: priced } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')

  const names = (priced || []).map((p) => p.name)
  const pricesOut = (priced || []).map((p) => Number(p.price))
  const primaryUrls = (imgs || []).map((i) => i.url)
  const lifeLeft = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', life.id)
    .eq('status', 'PUBLISHED')

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'electronics-store-images.csv'), preview.join('\n'))

  console.log('\n=== Electronics rebuild ===')
  console.log('Products', names.length, 'unique names', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Unique primary images', new Set(primaryUrls).size)
  console.log('Price min/max', Math.min(...pricesOut), Math.max(...pricesOut))
  for (const b of PRICE_BAND_TEMPLATE) {
    const n =
      b.min === 300
        ? pricesOut.filter((p) => p >= 300 && p <= 800).length
        : pricesOut.filter((p) => p > b.min && p <= b.max).length
    console.log(`  ${b.min}-${b.max}: ${n}`)
  }
  console.log('Lifestyle ~', lifeLeft.count)
  for (const p of (priced || []).slice(0, 6)) {
    const img = (imgs || []).find((i) => i.productId === p.id)
    console.log(` - ${p.name} $${p.price}`)
    console.log(`   ${img?.url}`)
  }

  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error('dup names')
  if (new Set(primaryUrls).size !== primaryUrls.length) throw new Error('dup images')
  if (primaryUrls.some((u) => /loremflickr|picsum|placeimg|pravatar/i.test(u))) {
    throw new Error('random stock still present')
  }
  if (names.length < 35) throw new Error(`too few electronics: ${names.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
