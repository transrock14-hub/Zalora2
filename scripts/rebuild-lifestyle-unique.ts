/**
 * Rebuild Lifestyle as a real store catalogue:
 * - One unique product per listing (NO "— Photo 2" duplicates)
 * - Extra DummyJSON images become a gallery on the SAME product
 * - Pad to 100 with other unique FakeStore items (backpack, jewellery, tech)
 *
 * Run: npx tsx scripts/rebuild-lifestyle-unique.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { salesPriceFromWholesale, wholesalePriceFromSales } from '../src/lib/wholesale-pricing'

function loadEnv() {
  try {
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
  } catch {}
}
loadEnv()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing Supabase env')
  process.exit(1)
}
const supabase = createClient(URL, KEY)

const TARGET = 100
const DJ_CATEGORIES = new Set([
  'home-decoration',
  'kitchen-accessories',
  'furniture',
  'fragrances',
  'skin-care',
  'beauty',
  'sports-accessories',
  'mobile-accessories',
  'sunglasses',
])

type SourceProduct = {
  name: string
  short: string
  description: string
  wholesale: number
  images: string[]
  rating: number
  brand: string
  sourceKey: string
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function cleanTitle(title: string) {
  return title.replace(/\s*[—–-]\s*Photo\s*\d+\s*$/i, '').trim()
}

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

async function loadDummyJson(): Promise<SourceProduct[]> {
  const res = await fetch('https://dummyjson.com/products?limit=200')
  if (!res.ok) throw new Error(`DummyJSON ${res.status}`)
  const data = (await res.json()) as {
    products: Array<{
      id: number
      title: string
      description: string
      category: string
      price: number
      rating?: number
      brand?: string
      images: string[]
      thumbnail?: string
    }>
  }

  const out: SourceProduct[] = []
  const seenTitles = new Set<string>()

  for (const p of data.products || []) {
    if (!DJ_CATEGORIES.has(p.category)) continue
    const name = cleanTitle(p.title)
    const key = name.toLowerCase()
    if (seenTitles.has(key)) continue
    seenTitles.add(key)

    const images = Array.from(
      new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
    )
    if (!images.length) continue

    const sale = round2(Number(p.price) || 20)
    out.push({
      name,
      short: p.brand ? `${p.brand} · ${name}` : name,
      description: p.description || name,
      wholesale: wholesalePriceFromSales(sale),
      images,
      rating: Math.min(5, Math.max(3.5, Number(p.rating) || 4)),
      brand: p.brand || 'Zalora Select',
      sourceKey: `dj-${p.id}`,
    })
  }
  return out
}

async function loadFakeStoreFill(need: number, excludeTitles: Set<string>): Promise<SourceProduct[]> {
  if (need <= 0) return []
  const res = await fetch('https://fakestoreapi.com/products')
  if (!res.ok) throw new Error(`FakeStore ${res.status}`)
  const data = (await res.json()) as Array<{
    id: number
    title: string
    description: string
    category: string
    price: number
    image: string
    rating?: { rate: number }
  }>

  // Prefer lifestyle-friendly FakeStore categories; skip apparel duplicates
  const preferred = ['jewelery', 'electronics']
  const backpack = data.filter((p) => /backpack/i.test(p.title))
  const rest = data.filter(
    (p) => preferred.includes(p.category) || /backpack/i.test(p.title)
  )
  const ordered = [...backpack, ...rest.filter((p) => !backpack.includes(p))]

  const out: SourceProduct[] = []
  for (const p of ordered) {
    if (out.length >= need) break
    const name = cleanTitle(p.title)
    if (excludeTitles.has(name.toLowerCase())) continue
    if (!(await urlOk(p.image))) continue
    excludeTitles.add(name.toLowerCase())
    const sale = round2(Number(p.price) || 25)
    out.push({
      name,
      short: name,
      description: p.description || name,
      wholesale: wholesalePriceFromSales(sale),
      images: [p.image],
      rating: Math.min(5, Math.max(3.5, Number(p.rating?.rate) || 4)),
      brand: 'Zalora Select',
      sourceKey: `fs-${p.id}`,
    })
  }
  return out
}

async function main() {
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'lifestyle')
    .single()
  if (catErr || !cat) throw catErr || new Error('Lifestyle category missing')

  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  console.log(`Clearing ${ids.length} Lifestyle products...`)

  if (ids.length) {
    for (let i = 0; i < ids.length; i += 40) {
      const chunk = ids.slice(i, i + 40)
      const { data: oi } = await supabase
        .from('order_items')
        .select('id')
        .in('productId', chunk)
        .limit(1)
      if (oi?.length) throw new Error('Abort: products linked to orders')
    }
    for (let i = 0; i < ids.length; i += 40) {
      const chunk = ids.slice(i, i + 40)
      await supabase.from('product_images').delete().in('productId', chunk)
      const { error } = await supabase.from('products').delete().in('id', chunk)
      if (error) throw error
    }
  }

  console.log('Loading unique DummyJSON products...')
  let catalog = await loadDummyJson()
  console.log(`  ${catalog.length} unique DummyJSON items`)

  // Validate primary images; drop broken
  const okCatalog: SourceProduct[] = []
  for (const item of catalog) {
    const goodImages: string[] = []
    for (const img of item.images) {
      if (await urlOk(img)) goodImages.push(img)
    }
    if (!goodImages.length) {
      console.warn(`  drop (no images): ${item.name}`)
      continue
    }
    okCatalog.push({ ...item, images: goodImages.slice(0, 5) })
  }
  catalog = okCatalog
  console.log(`  ${catalog.length} with working images`)

  const titles = new Set(catalog.map((c) => c.name.toLowerCase()))
  if (catalog.length < TARGET) {
    console.log(`Filling ${TARGET - catalog.length} more unique items from FakeStore...`)
    const fill = await loadFakeStoreFill(TARGET - catalog.length, titles)
    catalog = [...catalog, ...fill]
    console.log(`  catalog size now ${catalog.length}`)
  }

  if (catalog.length < TARGET) {
    throw new Error(`Only ${catalog.length} unique products available (need ${TARGET})`)
  }

  // Shuffle lightly by source category mix: sort by name for stable uniqueness feel
  // Prefer variety in first page: interleave roughly by hashing name
  catalog = catalog
    .slice(0, TARGET)
    .sort((a, b) => a.sourceKey.localeCompare(b.sourceKey))

  // Soft interleave: kitchen / sports / home / beauty so first page isn't 5 perfumes
  const buckets: Record<string, SourceProduct[]> = {}
  for (const item of catalog) {
    const b =
      /perfume|fragrance|chanel|calvin|dior|gucci/i.test(item.name) || /fragrances/i.test(item.short)
        ? 'fragrance'
        : /lipstick|mascara|nail|eyeshadow|powder|serum|cream|skin/i.test(item.name)
          ? 'beauty'
          : /ball|bat|racket|gloves|sports/i.test(item.name)
            ? 'sports'
            : /airpods|watch|pod|phone|camera|monopod|ssd|monitor|drive/i.test(item.name)
              ? 'tech'
              : /sofa|bed|chair|table|lamp|plant|frame|swing/i.test(item.name)
                ? 'home'
                : 'kitchen'
    ;(buckets[b] ||= []).push(item)
  }
  const interleaved: SourceProduct[] = []
  const keys = Object.keys(buckets)
  let added = true
  while (interleaved.length < TARGET && added) {
    added = false
    for (const k of keys) {
      const next = buckets[k].shift()
      if (next) {
        interleaved.push(next)
        added = true
      }
      if (interleaved.length >= TARGET) break
    }
  }
  catalog = interleaved.slice(0, TARGET)

  const runTag = Date.now().toString(36)
  const preview = ['index,name,images,wholesale,sale']
  const nameSet = new Set<string>()

  console.log(`Inserting ${catalog.length} unique Lifestyle products...`)
  for (let i = 0; i < catalog.length; i++) {
    const item = catalog[i]
    if (nameSet.has(item.name.toLowerCase())) {
      throw new Error(`Duplicate name blocked: ${item.name}`)
    }
    nameSet.add(item.name.toLowerCase())
    if (/photo\s*\d+/i.test(item.name)) {
      throw new Error(`Photo suffix leaked: ${item.name}`)
    }

    const sale = salesPriceFromWholesale(item.wholesale)
    const slug = `ls-${slugify(item.name)}-${runTag}-${i + 1}`
    const sku = `LSU-${String(i + 1).padStart(3, '0')}-${runTag}`

    const { data: product, error: insErr } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug,
        description: item.description,
        shortDesc: item.short,
        price: sale,
        comparePrice: round2(sale * 1.12),
        wholesalePrice: item.wholesale,
        salePrice: sale,
        costPrice: item.wholesale,
        sku,
        stock: 15 + ((i * 11) % 70),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 12,
        isPromoted: i % 7 === 0,
        rating: round2(item.rating),
        totalReviews: 4 + (i % 40),
        totalSales: (i * 3) % 40,
        views: 30 + i * 4,
      })
      .select('id')
      .single()

    if (insErr || !product) throw insErr || new Error('insert failed')

    const imageRows = item.images.map((url, idx) => ({
      productId: product.id,
      url,
      alt: item.name,
      sortOrder: idx,
      isPrimary: idx === 0,
    }))
    const { error: imgErr } = await supabase.from('product_images').insert(imageRows)
    if (imgErr) throw imgErr

    preview.push(
      [
        i + 1,
        `"${item.name.replace(/"/g, '""')}"`,
        item.images.length,
        item.wholesale,
        sale,
      ].join(',')
    )
    if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}/${TARGET}`)
  }

  const { data: verify } = await supabase
    .from('products')
    .select('id, name')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')

  const names = (verify || []).map((p) => p.name)
  const photoSuffix = names.filter((n) => /photo\s*\d+/i.test(n))
  const uniqueNames = new Set(names.map((n) => n.toLowerCase()))

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  const path = join(process.cwd(), 'catalog', 'lifestyle-unique-live.csv')
  writeFileSync(path, preview.join('\n'), 'utf8')

  console.log('\n=== Lifestyle unique rebuild ===')
  console.log(`Products: ${names.length}`)
  console.log(`Unique names: ${uniqueNames.size}`)
  console.log(`"Photo N" titles: ${photoSuffix.length} (must be 0)`)
  console.log(`CSV: ${path}`)
  console.log('Sample titles:')
  for (const n of names.slice(0, 12)) console.log(`  - ${n}`)

  if (names.length !== TARGET) throw new Error('Count mismatch')
  if (uniqueNames.size !== TARGET) throw new Error('Duplicate titles remain')
  if (photoSuffix.length) throw new Error('Photo suffixes remain')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
