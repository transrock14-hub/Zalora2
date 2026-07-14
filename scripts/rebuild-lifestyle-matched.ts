/**
 * Rebuild Lifestyle so NAME and IMAGE always match.
 *
 * Previous runs used Picsum / random Unsplash fallbacks → portraits &
 * landscapes next to "Meal Planner" / "Towel Set". That was wrong.
 *
 * This script:
 * 1) Deletes current Lifestyle products (no order_items).
 * 2) Imports real DummyJSON products (title + photos from same item).
 * 3) Pads to 100 with alternate product photos, still same title/product.
 *
 * Run: npx tsx scripts/rebuild-lifestyle-matched.ts
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
const ALLOWED_CATEGORIES = new Set([
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

type DjProduct = {
  id: number
  title: string
  description: string
  category: string
  price: number
  discountPercentage?: number
  rating?: number
  stock?: number
  brand?: string
  sku?: string
  images: string[]
  thumbnail?: string
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

async function fetchDummyJson(): Promise<DjProduct[]> {
  const res = await fetch('https://dummyjson.com/products?limit=200')
  if (!res.ok) throw new Error(`DummyJSON HTTP ${res.status}`)
  const data = (await res.json()) as { products: DjProduct[] }
  return (data.products || []).filter((p) => ALLOWED_CATEGORIES.has(p.category))
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

async function main() {
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', 'lifestyle')
    .single()
  if (catErr || !cat) throw catErr || new Error('Lifestyle category missing')

  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  console.log(`Existing Lifestyle products: ${ids.length}`)

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
    console.log('Deleting mismatched Lifestyle products...')
    for (let i = 0; i < ids.length; i += 40) {
      const chunk = ids.slice(i, i + 40)
      await supabase.from('product_images').delete().in('productId', chunk)
      const { error } = await supabase.from('products').delete().in('id', chunk)
      if (error) throw error
    }
  }

  console.log('Fetching DummyJSON lifestyle-capable products...')
  const source = await fetchDummyJson()
  console.log(`  ${source.length} source products`)

  // Build catalog rows: one primary per product, then alternate views with same name family
  type Row = {
    name: string
    short: string
    description: string
    wholesale: number
    images: string[]
    rating: number
    brand: string
    sourceId: number
  }

  const rows: Row[] = []
  const usedImage = new Set<string>()

  for (const p of source) {
    const imgs = Array.from(
      new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
    )
    const primary = imgs[0]
    if (!primary) continue
    if (!(await urlOk(primary))) {
      console.warn(`  skip (bad image): ${p.title}`)
      continue
    }
    usedImage.add(primary)
    const sale = round2(Number(p.price) || 20)
    const wholesale = wholesalePriceFromSales(sale)
    rows.push({
      name: p.title,
      short: p.brand ? `${p.brand} — ${p.title}` : p.title,
      description: p.description || p.title,
      wholesale,
      images: imgs.slice(0, 4),
      rating: Math.min(5, Math.max(3, Number(p.rating) || 4)),
      brand: p.brand || 'Catalog',
      sourceId: p.id,
    })
  }

  // Pad to 100 using alternate angles of the same product (name stays accurate)
  if (rows.length < TARGET) {
    console.log(`Padding from ${rows.length} to ${TARGET} with matching alternate views...`)
    outer: for (const p of source) {
      if (rows.length >= TARGET) break
      const imgs = Array.from(
        new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
      )
      for (let i = 1; i < imgs.length; i++) {
        if (rows.length >= TARGET) break outer
        const img = imgs[i]
        if (usedImage.has(img)) continue
        if (!(await urlOk(img))) continue
        usedImage.add(img)
        const sale = round2(Number(p.price) || 20)
        const wholesale = wholesalePriceFromSales(sale)
        rows.push({
          name: `${p.title} — Photo ${i + 1}`,
          short: `Additional product photo of ${p.title}`,
          description: `${p.description || p.title}\n\nThis listing shows another official product photo of the same item.`,
          wholesale,
          images: [img],
          rating: Math.min(5, Math.max(3, Number(p.rating) || 4)),
          brand: p.brand || 'Catalog',
          sourceId: p.id,
        })
      }
    }
  }

  if (rows.length < TARGET) {
    throw new Error(`Could only assemble ${rows.length}/${TARGET} matched products`)
  }

  const finalRows = rows.slice(0, TARGET)
  const runTag = Date.now().toString(36)
  const preview: string[] = ['index,name,image,wholesale,sale']

  console.log(`Inserting ${finalRows.length} matched Lifestyle products...`)
  let created = 0

  for (let i = 0; i < finalRows.length; i++) {
    const item = finalRows[i]
    const sale = salesPriceFromWholesale(item.wholesale)
    const slug = `ls-match-${slugify(item.name)}-${runTag}-${i + 1}`
    const sku = `LSM-${String(i + 1).padStart(3, '0')}-${runTag}`

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
        comparePrice: round2(sale * 1.15),
        wholesalePrice: item.wholesale,
        salePrice: sale,
        costPrice: item.wholesale,
        sku,
        stock: 20 + (i % 60),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 10,
        isPromoted: i % 6 === 0,
        rating: round2(item.rating),
        totalReviews: 5 + (i % 35),
        totalSales: i % 25,
        views: 40 + i * 2,
      })
      .select('id')
      .single()

    if (insErr || !product) {
      console.error(insErr)
      throw insErr || new Error('insert failed')
    }

    const imageRows = item.images
      .filter((u, idx, arr) => arr.indexOf(u) === idx)
      .slice(0, 4)
      .map((url, idx) => ({
        productId: product.id,
        url,
        alt: item.name,
        sortOrder: idx,
        isPrimary: idx === 0,
      }))

    const { error: imgErr } = await supabase.from('product_images').insert(imageRows)
    if (imgErr) throw imgErr

    created++
    preview.push(
      [i + 1, `"${item.name.replace(/"/g, '""')}"`, imageRows[0].url, item.wholesale, sale].join(',')
    )
    if ((i + 1) % 20 === 0) console.log(`  … ${i + 1}/${TARGET}`)
  }

  // Verify: no picsum, name/image sample
  const { data: verify } = await supabase
    .from('products')
    .select('id, name')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const { data: imgs } = await supabase
    .from('product_images')
    .select('url, productId, isPrimary')
    .in(
      'productId',
      (verify || []).map((p) => p.id)
    )
    .eq('isPrimary', true)

  const picsum = (imgs || []).filter((i) => i.url.includes('picsum'))
  const uniqueUrls = new Set((imgs || []).map((i) => i.url))

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  const path = join(process.cwd(), 'catalog', 'lifestyle-matched-live.csv')
  writeFileSync(path, preview.join('\n'), 'utf8')

  console.log('\n=== Lifestyle rebuild (matched) ===')
  console.log(`Products: ${(verify || []).length}`)
  console.log(`Primary images: ${(imgs || []).length}, unique: ${uniqueUrls.size}`)
  console.log(`Picsum leftovers: ${picsum.length} (must be 0)`)
  console.log(`CSV: ${path}`)
  console.log('Samples:')
  for (const p of (verify || []).slice(0, 5)) {
    const img = (imgs || []).find((i) => i.productId === p.id)
    console.log(`  ${p.name}`)
    console.log(`    ${img?.url}`)
  }

  if ((verify || []).length < TARGET) throw new Error('Count below target')
  if (picsum.length) throw new Error('Picsum images still present')
  if (uniqueUrls.size < TARGET * 0.9) throw new Error('Too many repeated primary images')

  void created
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
