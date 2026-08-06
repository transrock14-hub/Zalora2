/**
 * Rebuild Accessories with Amazon/Shein-style matched product photos:
 * - DummyJSON / FakeStore / Escuela where title matches the photo
 * - No loremflickr / picsum / random stock
 * - No image reuse, no "Photo N" clones
 * - Price bands: 10×($300–800), 10×($800–2500), 10×($2500–3000),
 *   10×($3000–4000), 10×($4000–5000)  → 50 products
 *
 * Reclaims watches / jewellery / sunglasses / beauty / fragrance listings
 * currently sitting in Lifestyle so Accessories owns those store photos.
 *
 * Run: npx tsx scripts/rebuild-accessories-store-images.ts
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

const ACC_SLUG = 'accessories'
const LIFE_SLUG = 'lifestyle'

const DJ_CATS = new Set([
  'mens-watches',
  'womens-watches',
  'womens-jewellery',
  'womens-bags',
  'sunglasses',
  'beauty',
  'fragrances',
  'skin-care',
])

/** Wearable / personal tech accessories — not speakers / chargers / studio gear */
const MOBILE_ACC_ALLOW = new Set([
  'Apple Airpods',
  'Apple AirPods Max Silver',
  'Beats Flex Wireless Earphones',
  'Apple Watch Series 4 Gold',
  'Apple MagSafe Battery Pack',
  'iPhone 12 Silicone Case with MagSafe Plum',
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

function buildPrices(): number[] {
  const prices: number[] = []
  for (const band of PRICE_BANDS) {
    for (let i = 0; i < band.count; i++) {
      const t = band.count === 1 ? 0.5 : i / (band.count - 1)
      const lo = band.min === 300 ? 305 : band.min + 1
      const hi = band.max
      prices.push(round2(lo + (hi - lo) * t))
    }
  }
  if (prices.length !== TARGET) throw new Error(`Price band total ${prices.length} != ${TARGET}`)
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
    if (!name || seen.has(key)) return
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

  const djRes = await fetch('https://dummyjson.com/products?limit=250')
  const dj = (await djRes.json()) as { products: any[] }
  for (const p of dj.products || []) {
    const title = String(p.title || '').trim()
    const allowed =
      DJ_CATS.has(p.category) ||
      (p.category === 'mobile-accessories' && MOBILE_ACC_ALLOW.has(title))
    if (!allowed) continue
    await push({
      name: title,
      short: p.brand ? `${p.brand} · ${title}` : title,
      description: p.description || title,
      images: [...(p.images || []), p.thumbnail].filter(Boolean),
      source: `dj-${p.id}`,
    })
  }

  const fsRes = await fetch('https://fakestoreapi.com/products')
  const fs = (await fsRes.json()) as any[]
  for (const p of fs || []) {
    if (p.category !== 'jewelery') continue
    await push({
      name: String(p.title).trim(),
      description: p.description || p.title,
      images: [p.image],
      source: `fs-${p.id}`,
    })
  }

  const escRes = await fetch('https://api.escuelajs.co/api/v1/products?offset=0&limit=150')
  const esc = (await escRes.json()) as any[]
  const escAllow =
    /smartwatch|sunglass|handbag|parfum|perfume|luggage|wallet|jewellery|jewelry|watch|earring|necklace|bracelet/i
  for (const p of esc || []) {
    const name = String(p.title || '').trim()
    if (!name || /test|^string$/i.test(name)) continue
    if (!escAllow.test(name)) continue
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

  return items
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', ACC_SLUG).single()
  if (!cat) throw new Error('Accessories category missing')
  const { data: life } = await supabase.from('categories').select('id').eq('slug', LIFE_SLUG).single()
  if (!life) throw new Error('Lifestyle category missing')

  const catalogPreview = await loadStoreCatalog()
  console.log(`Store catalog loaded: ${catalogPreview.length} matched products`)
  const homeNames = new Set(catalogPreview.map((c) => c.name.toLowerCase()))

  // 1) Reclaim accessory photos from Lifestyle
  const { data: lifeRows } = await supabase.from('products').select('id, name').eq('categoryId', life.id)
  const lifeRemove = (lifeRows || []).filter((p) => homeNames.has(p.name.toLowerCase()))
  console.log(`Removing ${lifeRemove.length} accessory items from Lifestyle...`)
  for (let i = 0; i < lifeRemove.length; i += 40) {
    const chunk = lifeRemove.slice(i, i + 40).map((p) => p.id)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    const blocked = new Set((oi || []).map((x) => x.productId))
    const safe = chunk.filter((id) => !blocked.has(id))
    if (!safe.length) continue
    await supabase.from('product_images').delete().in('productId', safe)
    await supabase.from('products').delete().in('id', safe)
  }

  // 2) Keep Accessories order-linked; delete the rest
  const { data: existing } = await supabase.from('products').select('id, name').eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  const keep = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    for (const r of oi || []) keep.add(r.productId)
  }
  console.log('Keep Accessories (orders)', keep.size)

  const toDelete = ids.filter((id) => !keep.has(id))
  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    const { error } = await supabase.from('products').delete().in('id', chunk)
    if (error) throw error
  }
  console.log('Deleted old Accessories', toDelete.length)

  // Exclude names already kept
  const { data: keptRows } = await supabase
    .from('products')
    .select('id, name')
    .eq('categoryId', cat.id)
  const exclude = new Set((keptRows || []).map((p) => p.name.toLowerCase()))
  const pool = catalogPreview.filter((c) => !exclude.has(c.name.toLowerCase()))

  const need = TARGET - keep.size
  if (pool.length < need) {
    throw new Error(`Only ${pool.length} matched store products available, need ${need}`)
  }

  // Prefer watches/jewellery/sunglasses first, then beauty/fragrance, then tech
  const rank = (name: string) => {
    if (/watch|rolex|longines|iwc/i.test(name)) return 0
    if (/earring|bracelet|necklace|jewel|gold|ring/i.test(name)) return 1
    if (/glasses|sunglass/i.test(name)) return 2
    if (/bag|handbag|luggage/i.test(name)) return 3
    if (/perfume|parfum|fragrance|ck one|chanel|dior/i.test(name)) return 4
    if (/mascara|eyeshadow|powder|lotion|soap|vaseline|olay/i.test(name)) return 5
    return 6
  }
  const ordered = [...pool].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
  const selected = ordered.slice(0, need)

  const prices = buildPrices()
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

  // Re-image kept products with unused jewellery alt angles (title may differ; keep order SKU names)
  const usedImages = new Set<string>()
  const jewelleryDonors = ordered.filter((p) =>
    /earring|bracelet|necklace|jewel|gold|dragon|micropave|princess|owl/i.test(p.name)
  )
  const leftoverForKeep = ordered.slice(need)
  for (let ki = 0; ki < keepIds.length; ki++) {
    const donor = jewelleryDonors[ki] || leftoverForKeep[ki] || selected[selected.length - 1 - ki]
    if (!donor) continue
    // Prefer gallery alt (index 1+) so primary of donor product stays unique
    const alts = donor.images.slice(1).filter((u) => !usedImages.has(u))
    const imgs = alts.length ? alts : donor.images.filter((u) => !usedImages.has(u))
    if (!imgs.length) continue
    usedImages.add(imgs[0])
    await supabase.from('product_images').delete().eq('productId', keepIds[ki])
    await supabase.from('product_images').insert({
      productId: keepIds[ki],
      url: imgs[0],
      alt: keptRows?.find((r) => r.id === keepIds[ki])?.name || donor.name,
      sortOrder: 0,
      isPrimary: true,
    })
  }

  const insertPrices = prices.slice(keep.size)
  const runTag = Date.now().toString(36)
  const preview = ['index,name,price,image,source']

  console.log(`Inserting ${selected.length} store-matched Accessories...`)
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
        slug: `acc-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `ACC-${String(i + 1).padStart(3, '0')}-${runTag}`,
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
    .eq('categoryId', life.id)
    .eq('status', 'PUBLISHED')

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'accessories-store-images.csv'), preview.join('\n'))

  console.log('\n=== Accessories store-images rebuild ===')
  console.log('Products', names.length, 'unique names', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Unique primary images', new Set(primaryUrls).size)
  console.log('Price min/max', Math.min(...pricesOut), Math.max(...pricesOut))
  console.log('Bands:')
  for (const b of PRICE_BANDS) {
    const n =
      b.min === 300
        ? pricesOut.filter((p) => p >= 300 && p <= 800).length
        : pricesOut.filter((p) => p > b.min && p <= b.max).length
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
  if (primaryUrls.some((u) => /loremflickr|picsum|placeimg|pravatar/i.test(u))) {
    throw new Error('random stock still present')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
