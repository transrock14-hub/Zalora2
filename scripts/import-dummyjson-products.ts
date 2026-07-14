/**
 * Import REAL product catalogs from DummyJSON (public API — no scraping).
 *
 * Why not Amazon / Noon / Shein / Lazada scrapers?
 * Those sites block bots, ban IPs, and forbid scraping in their Terms of Service.
 * DummyJSON + FakeStore give licensed sample products with real CDN images.
 *
 * Source: https://dummyjson.com/products
 * Inserts as admin catalog products (shopId = null) so they appear in Wholesale.
 * Pricing: sales = DummyJSON price; wholesale = sales / 1.20 (20% reseller margin).
 *
 * Run:
 *   npx tsx scripts/import-dummyjson-products.ts
 *   npx tsx scripts/import-dummyjson-products.ts --limit=100
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { salesPriceFromWholesale, wholesalePriceFromSales } from '../src/lib/wholesale-pricing'

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // rely on process env
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

/** Map DummyJSON category → Zalora category slug */
const CATEGORY_MAP: Record<string, string> = {
  beauty: 'accessories',
  'skin-care': 'accessories',
  fragrances: 'accessories',
  sunglasses: 'accessories',
  'mens-watches': 'accessories',
  'womens-watches': 'accessories',
  'womens-jewellery': 'accessories',
  furniture: 'home-garden',
  'home-decoration': 'home-garden',
  'kitchen-accessories': 'home-garden',
  groceries: 'lifestyle',
  motorcycle: 'lifestyle',
  vehicle: 'lifestyle',
  'sports-accessories': 'lifestyle',
  laptops: 'electronics',
  smartphones: 'electronics',
  tablets: 'electronics',
  'mobile-accessories': 'electronics',
  'mens-shirts': 'men-clothing',
  'mens-shoes': 'men-shoes',
  tops: 'women-clothing',
  'womens-dresses': 'women-clothing',
  'womens-bags': 'women-bags',
  'womens-shoes': 'women-shoes',
}

interface DummyProduct {
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
  thumbnail?: string
  images?: string[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

async function fetchAllDummyProducts(limitCap: number): Promise<DummyProduct[]> {
  const out: DummyProduct[] = []
  let skip = 0
  const page = 50
  while (out.length < limitCap) {
    const take = Math.min(page, limitCap - out.length)
    const res = await fetch(
      `https://dummyjson.com/products?limit=${take}&skip=${skip}&select=id,title,description,category,price,discountPercentage,rating,stock,brand,sku,thumbnail,images`
    )
    if (!res.ok) throw new Error(`DummyJSON HTTP ${res.status}`)
    const data = (await res.json()) as { products: DummyProduct[]; total: number }
    if (!data.products?.length) break
    out.push(...data.products)
    skip += data.products.length
    if (skip >= (data.total || 0)) break
  }
  return out
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limitCap = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 200) : 200

  console.log('Fetching products from DummyJSON…')
  const products = await fetchAllDummyProducts(limitCap)
  console.log(`  got ${products.length} products`)

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('isActive', true)
  if (catErr) throw catErr
  if (!categories?.length) {
    console.error('No categories in DB. Create categories first.')
    process.exit(1)
  }
  const catBySlug = new Map(categories.map((c) => [c.slug, c]))
  const fallbackCat =
    catBySlug.get('lifestyle') || catBySlug.get('accessories') || categories[0]

  const runTag = Date.now().toString(36)
  let created = 0
  let images = 0
  let skipped = 0

  for (const p of products) {
    const targetSlug = CATEGORY_MAP[p.category] || fallbackCat.slug
    const category = catBySlug.get(targetSlug) || fallbackCat
    const sale = round2(Number(p.price) || 0)
    if (!(sale > 0)) {
      skipped++
      continue
    }
    const wholesale = wholesalePriceFromSales(sale)
    const saleNormalized = salesPriceFromWholesale(wholesale) // exact +20%
    const compare =
      p.discountPercentage && p.discountPercentage > 0
        ? round2(saleNormalized / (1 - Math.min(p.discountPercentage, 40) / 100))
        : null

    const baseSlug = slugify(p.title) || `item-${p.id}`
    const slug = `dj-${baseSlug}-${runTag}-${p.id}`

    const { data: product, error: insErr } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: category.id,
        name: p.title,
        slug,
        description: p.description || null,
        shortDesc: p.brand ? `${p.brand} — ${p.title}` : p.title,
        price: saleNormalized,
        comparePrice: compare && compare > saleNormalized ? compare : null,
        wholesalePrice: wholesale,
        salePrice: saleNormalized,
        stock: Math.max(0, Number(p.stock) || 20),
        sku: p.sku || `DJ-${p.id}`,
        status: 'PUBLISHED',
        isFeatured: created % 7 === 0,
        isPromoted: !!compare,
        rating: Math.min(5, Math.max(0, Number(p.rating) || 4)),
        totalReviews: Array.isArray((p as any).reviews) ? (p as any).reviews.length : 3,
      })
      .select('id')
      .single()

    if (insErr || !product) {
      console.warn(`  skip ${p.title}:`, insErr?.message)
      skipped++
      continue
    }

    const urls = Array.from(
      new Set([...(p.images || []), p.thumbnail].filter(Boolean) as string[])
    ).slice(0, 5)

    if (urls.length) {
      const rows = urls.map((url, idx) => ({
        productId: product.id,
        url,
        alt: p.title,
        isPrimary: idx === 0,
        sortOrder: idx,
      }))
      const { error: imgErr } = await supabase.from('product_images').insert(rows)
      if (imgErr) {
        console.warn(`  images failed for ${p.title}:`, imgErr.message)
      } else {
        images += rows.length
      }
    }

    created++
    if (created % 25 === 0) console.log(`  … ${created} products`)
  }

  console.log(
    `\nDone. Created ${created} catalog products (${images} images). Skipped ${skipped}.`
  )
  console.log('These are shopId=null catalog items → visible in Wholesale Management.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
