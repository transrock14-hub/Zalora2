/**
 * Import scraped Namshi catalogue (catalog/namshi-catalog.json) into Zalora.
 *
 * - Admin catalog products (shopId = null) → appear in Wholesale
 * - Pricing: Namshi price = sales; wholesale = sales / 1.20
 * - Idempotent via sku `NMSH-{source_id}`
 *
 * Run:
 *   npx tsx scripts/import-namshi-catalog.ts
 *   npx tsx scripts/import-namshi-catalog.ts --limit=50
 *   npx tsx scripts/import-namshi-catalog.ts --dry-run
 */
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { wholesalePriceFromSales } from '../src/lib/wholesale-pricing'

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

interface NamshiProduct {
  source_id: string
  name: string
  category: string
  subcategories?: string
  store?: string
  price: number | null
  compare_price?: number | null
  image_url?: string
  product_url?: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Zalora storefront price band for imported Namshi items */
const PRICE_MIN_USD = 10
const PRICE_MAX_USD = 5000

function clampSalesPrice(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return PRICE_MIN_USD
  return round2(Math.min(PRICE_MAX_USD, Math.max(PRICE_MIN_USD, raw)))
}

function unescapeUrl(url: string): string {
  return (url || '').replace(/&amp;/g, '&').trim()
}

/** Map Namshi category / subcategory signals → Zalora category slug */
function mapCategorySlug(p: NamshiProduct): string {
  const subs = (p.subcategories || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const cat = (p.category || '').toLowerCase()
  const blob = `${subs.join(' ')} ${cat} ${p.name || ''}`.toLowerCase()

  if (subs.includes('kids boys') || subs.includes('kids shoes boys') || subs.includes('kids bags boys')) {
    return 'boys'
  }
  if (subs.includes('kids girls') || subs.includes('kids shoes girls')) {
    return 'girls'
  }
  if (
    subs.some((s) =>
      [
        'computers & accessories',
        'mobiles & accessories',
        'video games',
        'television & video',
        'portable audio & video',
        'office electronics',
      ].includes(s)
    ) ||
    /console|television|laptop|phone|electronics|gaming/.test(blob)
  ) {
    return 'electronics'
  }
  if (
    subs.some((s) =>
      ['furniture', 'home improvement', 'washing machines'].includes(s)
    ) ||
    /furniture|washing machine|home improvement/.test(blob)
  ) {
    return 'home-garden'
  }
  if (subs.includes('bags') || subs.includes('bags & luggage') || /handbag|tote|clutch|crossbod|wallet/.test(blob)) {
    if (/men|male|mens/.test(blob) && !/women|womens|ladies/.test(blob)) return 'men-bags'
    return 'women-bags'
  }
  if (subs.includes('men') || (/\bmen\b/.test(cat) && !/women/.test(cat))) {
    if (/shoe|sneaker|boot|sandal|loafer|slipper/.test(blob)) return 'men-shoes'
    if (/bag|backpack|wallet/.test(blob)) return 'men-bags'
    return 'men-clothing'
  }
  if (subs.includes('women') || /\bwomen\b/.test(cat) || /dress|skirt|legging|handbag|clutch/.test(blob)) {
    if (/shoe|sandal|heel|boot|sneaker|loafer|slipper/.test(blob)) return 'women-shoes'
    if (/bag|handbag|tote|clutch|wallet|purse/.test(blob)) return 'women-bags'
    return 'women-clothing'
  }
  if (/shoe|sandal|sneaker|boot|heel/.test(blob)) {
    if (/men|male|mens/.test(blob)) return 'men-shoes'
    return 'women-shoes'
  }
  if (
    subs.includes('watches') ||
    subs.includes('fragrance') ||
    /watch|ring|earring|necklace|bracelet|perfume|fragrance|accessories|kelly|equestrian|chaînes|chaines/.test(
      blob
    )
  ) {
    return 'accessories'
  }
  if (subs.includes('clothing') || /shirt|polo|pants|knitwear|dress/.test(blob)) {
    if (/men|male/.test(blob)) return 'men-clothing'
    return 'women-clothing'
  }
  if (/nike|puma|adidas/.test(blob) && /shoe|sneaker/.test(blob)) return 'men-shoes'
  return 'lifestyle'
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 0) : 0

  const catalogPath = join(process.cwd(), 'catalog', 'namshi-catalog.json')
  const raw = JSON.parse(readFileSync(catalogPath, 'utf8')) as {
    products: NamshiProduct[]
    product_count?: number
  }
  let items = raw.products || []
  if (limit > 0) items = items.slice(0, limit)

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name')
  if (catErr || !categories?.length) {
    console.error('Failed to load categories', catErr)
    process.exit(1)
  }
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]))
  const fallbackCategoryId = catBySlug.get('lifestyle') || categories[0].id

  // Existing Namshi imports
  const { data: existing } = await supabase
    .from('products')
    .select('id, sku')
    .like('sku', 'NMSH-%')
  const existingSku = new Set((existing || []).map((p) => p.sku).filter(Boolean))

  console.log(
    `Namshi products to process: ${items.length} (already imported: ${existingSku.size})${dryRun ? ' [DRY RUN]' : ''}`
  )

  let inserted = 0
  let skipped = 0
  let failed = 0
  const mapCounts = new Map<string, number>()

  for (const p of items) {
    const sku = `NMSH-${p.source_id}`
    if (existingSku.has(sku)) {
      skipped++
      continue
    }

    const rawSales = Number(p.price)
    if (!Number.isFinite(rawSales) || rawSales <= 0) {
      console.warn(`Skip ${sku}: invalid price`, p.price)
      skipped++
      continue
    }

    const salePrice = clampSalesPrice(rawSales)
    const wholesale = round2(wholesalePriceFromSales(salePrice))
    let compare =
      p.compare_price != null && Number(p.compare_price) > 0
        ? round2(Number(p.compare_price))
        : round2(salePrice * 1.12)
    if (rawSales > PRICE_MAX_USD && Number(p.compare_price) > 0) {
      compare = round2(salePrice * (Number(p.compare_price) / rawSales))
    }
    compare = round2(
      Math.min(PRICE_MAX_USD, Math.max(salePrice + 0.01, compare))
    )

    const slugBase = slugify(p.name) || `namshi-${p.source_id}`
    const slug = `${slugBase}-nmsh-${p.source_id}`
    const catSlug = mapCategorySlug(p)
    mapCounts.set(catSlug, (mapCounts.get(catSlug) || 0) + 1)
    const categoryId = catBySlug.get(catSlug) || fallbackCategoryId

    const shortDesc = [p.category, p.store ? `Store: ${p.store}` : '']
      .filter(Boolean)
      .join(' · ')
      .slice(0, 180)
    const description = [
      p.name,
      p.category ? `Type: ${p.category}` : '',
      p.subcategories ? `Namshi categories: ${p.subcategories}` : '',
      p.store ? `Seller: ${p.store}` : '',
      p.product_url ? `Source: ${p.product_url}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const imageUrl = unescapeUrl(p.image_url || '')
    const productId = randomUUID()
    const now = new Date().toISOString()

    if (dryRun) {
      console.log(`[dry] ${sku} → ${catSlug} $${salePrice} / wholesale $${wholesale} — ${p.name}`)
      inserted++
      continue
    }

    const { error: insErr } = await supabase.from('products').insert({
      id: productId,
      shopId: null,
      categoryId,
      name: p.name.slice(0, 200),
      slug,
      description,
      shortDesc: shortDesc || p.category || 'Imported from Namshi',
      price: salePrice,
      salePrice,
      comparePrice: compare,
      costPrice: wholesale,
      wholesalePrice: wholesale,
      sku,
      stock: 50,
      lowStockAlert: 5,
      status: 'PUBLISHED',
      isFeatured: false,
      isPromoted: false,
      createdAt: now,
      updatedAt: now,
    })

    if (insErr) {
      console.error(`Fail ${sku}:`, insErr.message)
      failed++
      continue
    }

    if (imageUrl) {
      const { error: imgErr } = await supabase.from('product_images').insert({
        id: randomUUID(),
        productId,
        url: imageUrl,
        alt: p.name,
        sortOrder: 0,
        isPrimary: true,
      })
      if (imgErr) {
        console.warn(`  image warn ${sku}:`, imgErr.message)
      }
    }

    existingSku.add(sku)
    inserted++
    if (inserted % 25 === 0) {
      console.log(`  … ${inserted} inserted, ${skipped} skipped, ${failed} failed`)
    }
  }

  console.log('\n=== Import complete ===')
  console.log({ inserted, skipped, failed, dryRun })
  console.log('Category mapping counts (this run):')
  for (const [slug, n] of [...mapCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${slug}`)
  }

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  const { count: nmsh } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .like('sku', 'NMSH-%')
  console.log(`DB totals: products=${count}, namshi_imports=${nmsh}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
