/**
 * Import scraped zalora.com.ph catalogue (catalog/zalora-ph-catalog.json) into Zalora DB.
 *
 * - Admin catalog products (shopId = null) → Wholesale
 * - Pricing: USD sales from scrape; wholesale = sales / 1.20
 * - Prices clamped to $10–$5000
 * - Idempotent via sku `ZPH-{ConfigSku}`
 *
 * Run:
 *   npx tsx scripts/import-zalora-ph-catalog.ts
 *   npx tsx scripts/import-zalora-ph-catalog.ts --limit=50
 *   npx tsx scripts/import-zalora-ph-catalog.ts --dry-run
 */
import { createHash, randomUUID } from 'crypto'
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
    // process env
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

interface PhProduct {
  sku?: string
  name: string
  brand?: string
  category?: string
  color?: string
  price_usd?: number | null
  list_price_usd?: number | null
  special_price_usd?: number | null
  image_url?: string
  product_url?: string
  seller?: string
}

const PRICE_MIN_USD = 10
const PRICE_MAX_USD = 5000

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

function clampSalesPrice(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return PRICE_MIN_USD
  return round2(Math.min(PRICE_MAX_USD, Math.max(PRICE_MIN_USD, raw)))
}

function unescapeUrl(url: string): string {
  return (url || '').replace(/&amp;/g, '&').trim()
}

function makeSku(p: PhProduct): string {
  const base = (p.sku || '').trim() || createHash('sha1').update(p.product_url || p.name).digest('hex').slice(0, 12)
  return `ZPH-${base}`.slice(0, 64)
}

/** Map Zalora PH breadcrumb → local category slug (path only; ignore brand/name). */
function mapCategorySlug(p: PhProduct): string {
  const crumbs = (p.category || '')
    .split('>')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const top = crumbs[0] || ''
  const joined = crumbs.join(' ')
  const nameUrl = `${p.name || ''} ${p.product_url || ''}`.toLowerCase()

  if (top === 'kids' || crumbs.some((c) => /\bkids?\b/.test(c))) {
    if (crumbs.some((c) => /\bgirls?\b/.test(c)) || /\bgirls?\b/.test(nameUrl)) return 'girls'
    if (crumbs.some((c) => /\bboys?\b/.test(c)) || /\bboys?\b/.test(nameUrl)) return 'boys'
    return /\bgirl\b/.test(nameUrl) ? 'girls' : 'boys'
  }

  if (crumbs.some((c) => /bags?|backpack|luggage|clutch|tote|crossbody|wallet|purse|sling/.test(c))) {
    if (top === 'men' || crumbs.some((c) => c === 'men' || c.startsWith('men '))) return 'men-bags'
    return 'women-bags'
  }

  if (
    crumbs.some((c) =>
      /shoes?|sneakers?|sandals?|boots?|heels?|footwear|loafers?|slippers?|flats?|flip-?flops?/.test(c)
    )
  ) {
    if (top === 'men' || crumbs.some((c) => c === 'men' || c.startsWith('men '))) return 'men-shoes'
    if (top === 'sports' && /\bmen\b/.test(joined) && !/women/.test(joined)) return 'men-shoes'
    return 'women-shoes'
  }

  if (crumbs.some((c) => /beauty|skincare|make-?up|fragrance|perfume|grooming|hair care|bath/.test(c))) {
    return 'lifestyle'
  }

  if (top === 'men' || crumbs.some((c) => c === 'men' || c.startsWith('men '))) {
    return 'men-clothing'
  }

  if (top === 'women' || top === 'luxury' || crumbs.some((c) => /women/.test(c))) {
    return 'women-clothing'
  }

  if (top === 'sports') {
    if (/\bmen\b/.test(joined) && !/women/.test(joined)) return 'men-clothing'
    return 'women-clothing'
  }

  if (crumbs.some((c) => /accessories|watches?|jewellery|jewelry|belts?|sunglasses|hats?/.test(c))) {
    return 'accessories'
  }

  if (crumbs.some((c) => /home|garden|furniture|living|kitchen|decor/.test(c))) {
    return 'home-garden'
  }

  return 'lifestyle'
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 0) : 0

  const catalogPath = join(process.cwd(), 'catalog', 'zalora-ph-catalog.json')
  const raw = JSON.parse(readFileSync(catalogPath, 'utf8')) as {
    products: PhProduct[]
    product_count?: number
  }
  let items = raw.products || []
  if (limit > 0) items = items.slice(0, limit)

  const { data: categories, error: catErr } = await supabase.from('categories').select('id, slug, name')
  if (catErr || !categories?.length) {
    console.error('Failed to load categories', catErr)
    process.exit(1)
  }
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]))
  const fallbackCategoryId = catBySlug.get('lifestyle') || categories[0].id

  const { data: existing } = await supabase.from('products').select('id, sku').like('sku', 'ZPH-%')
  const existingSku = new Set((existing || []).map((p) => p.sku).filter(Boolean) as string[])

  console.log(
    `Zalora PH products to process: ${items.length} (already imported: ${existingSku.size})${dryRun ? ' [DRY RUN]' : ''}`
  )

  let inserted = 0
  let skipped = 0
  let failed = 0
  const mapCounts = new Map<string, number>()

  for (const p of items) {
    const sku = makeSku(p)
    if (existingSku.has(sku)) {
      skipped++
      continue
    }

    const rawSales = Number(p.special_price_usd ?? p.price_usd)
    if (!Number.isFinite(rawSales) || rawSales <= 0) {
      console.warn(`Skip ${sku}: invalid price`, p.price_usd)
      skipped++
      continue
    }

    const salePrice = clampSalesPrice(rawSales)
    const wholesale = round2(wholesalePriceFromSales(salePrice))
    let compare = Number(p.list_price_usd)
    if (!Number.isFinite(compare) || compare <= salePrice) {
      compare = round2(Math.min(PRICE_MAX_USD, salePrice * 1.15))
    } else {
      compare = round2(Math.min(PRICE_MAX_USD, Math.max(salePrice + 0.01, compare)))
    }

    const displayName = p.brand && p.name && !p.name.toLowerCase().includes(p.brand.toLowerCase())
      ? `${p.brand} ${p.name}`
      : p.name
    const slugBase = slugify(displayName) || `zph-${sku.slice(4, 16)}`
    const slug = `${slugBase}-zph-${createHash('sha1').update(sku).digest('hex').slice(0, 8)}`
    const catSlug = mapCategorySlug(p)
    mapCounts.set(catSlug, (mapCounts.get(catSlug) || 0) + 1)
    const categoryId = catBySlug.get(catSlug) || fallbackCategoryId

    const shortDesc = [p.brand, p.color, p.category].filter(Boolean).join(' · ').slice(0, 180)
    const description = [
      displayName,
      p.brand ? `Brand: ${p.brand}` : '',
      p.color ? `Color: ${p.color}` : '',
      p.category ? `Category: ${p.category}` : '',
      p.seller ? `Seller: ${p.seller}` : '',
      p.product_url ? `Source: ${p.product_url}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const imageUrl = unescapeUrl(p.image_url || '')
    const productId = randomUUID()
    const now = new Date().toISOString()

    if (dryRun) {
      if (inserted < 5 || inserted % 500 === 0) {
        console.log(`[dry] ${sku} → ${catSlug} $${salePrice} — ${displayName}`)
      }
      inserted++
      continue
    }

    const { error: insErr } = await supabase.from('products').insert({
      id: productId,
      shopId: null,
      categoryId,
      name: displayName.slice(0, 200),
      slug,
      description,
      shortDesc: shortDesc || p.category || 'Imported from Zalora PH',
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
      isPromoted: compare > salePrice,
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
        alt: displayName,
        sortOrder: 0,
        isPrimary: true,
      })
      if (imgErr) console.warn(`  image warn ${sku}:`, imgErr.message)
    }

    existingSku.add(sku)
    inserted++
    if (inserted % 50 === 0) {
      console.log(`  … ${inserted} inserted, ${skipped} skipped, ${failed} failed`)
    }
  }

  console.log('\n=== Import complete ===')
  console.log({ inserted, skipped, failed, dryRun })
  console.log('Category mapping counts (this run):')
  for (const [slug, n] of [...mapCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${slug}`)
  }

  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
  const { count: zph } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .like('sku', 'ZPH-%')
  console.log(`DB totals: products=${count}, zalora_ph_imports=${zph}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
