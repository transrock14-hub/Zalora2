/**
 * Replace the Lifestyle category with products from zalora.com.ph
 * Beauty + Home & Lifestyle (decor, kitchen, bed & bath).
 *
 * - Admin catalog (shopId = null)
 * - SKU: ZLS-{ConfigSku}
 * - Prices: PHP → USD @ 61.26, clamped $10–$5000; wholesale = sales / 1.20
 * - Deletes current lifestyle products not in order_items; archives ordered ones
 *
 * Run:
 *   npx tsx scripts/replace-lifestyle-zalora-ph.ts
 *   npx tsx scripts/replace-lifestyle-zalora-ph.ts --dry-run
 *   npx tsx scripts/replace-lifestyle-zalora-ph.ts --target=300
 */
import { createHash, randomUUID } from 'crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { wholesalePriceFromSales } from '../src/lib/wholesale-pricing'

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
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    /* process env */
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

const dryRun = process.argv.includes('--dry-run')
const targetArg = process.argv.find((a) => a.startsWith('--target='))
const TARGET = Math.max(100, parseInt(targetArg?.split('=')[1] || '300', 10) || 300)

const PHP_PER_USD = 61.26
const PRICE_MIN = 10
const PRICE_MAX = 5000
const CAT_SLUG = 'lifestyle'
const API = 'https://api.zalora.com.ph/v1/dynproducts/datajet/list'

/** Zalora PH Beauty + Home & Lifestyle category IDs. */
const CATEGORY_IDS = [
  503, // Women Beauty (broad)
  8330, // Skincare
  8297, // Make Up
  8355, // Fragrances
  8359, // Bath & Body
  8347, // Hair Care
  8321, // Nail Care
  8370, // Beauty Accessories
  8391, // Grooming
  8405, // Gift Sets
  4358, // Men Grooming
  11098, // Home Decor
  11081, // Kitchen & Dining
  10968, // Bed & Bath
]

const SEARCH_QUERIES = [
  'skincare',
  'fragrance',
  'lipstick',
  'serum',
  'moisturizer',
  'shampoo',
  'body wash',
  'perfume',
  'sunscreen',
  'foundation',
  'mascara',
  'hair oil',
  'cologne',
  'home decor',
  'drinkware',
  'candle',
  'towel',
  'mug',
  'bath',
  'face mask',
]

type ZaloraProduct = {
  ConfigSku: string
  Name: string
  Brand?: string
  Price?: string
  SpecialPrice?: string
  PriceInDecimal?: number
  SpecialPriceInDecimal?: number
  MainImageUrl?: string
  ImageList?: string[]
  Breadcrumbs?: string[]
  ProductUrl?: string
  SupplierName?: string
}

const KEEP_CRUMB_RE =
  /\bbeauty\b|skincare|skin\s*care|make\s*up|makeup|fragrance|bath\s*&\s*body|hair\s*care|nail\s*care|grooming|beauty\s*accessories|home\s*&\s*lifestyle|home\s*decor|kitchen\s*&\s*dining|bed\s*&\s*bath|personal\s*care|sun-?care|lipstick|perfume|cologne/i

const REJECT_CRUMB_RE =
  /\belectronics\b|technology|smart\s*watches?|clothing|shoes|sneakers|handbags|sports\s*>|outerwear|lifestyle\s*tops|lifestyle\s*bottoms|lifestyle\s*shoes/i

const REJECT_NAME_RE =
  /\b(pacifica|durango|charger|hornet|touring|remote\s*control\s*vehicle|monster\s*jam|megalodon|scale\s*remote|die[- ]?cast\s*car|rc\s*car)\b/i

const CLOTHING_RE =
  /\b(trousers?|t-?shirts?|sweatpants|jeans|dresses?|skirts?|hoodies?|jackets?|coats?|blouses?|shirts?|shorts|leggings?|sandals?|sneakers?|boots?|heels?|polo|sweatshirt)\b/i

const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number) =>
  round2(Math.min(PRICE_MAX, Math.max(PRICE_MIN, Number.isFinite(n) && n > 0 ? n : PRICE_MIN)))
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

function isLifestyleCandidate(p: ZaloraProduct): boolean {
  const name = p.Name || ''
  const brand = p.Brand || ''
  const crumbs = (p.Breadcrumbs || []).join(' > ')
  const blob = `${brand} ${name} ${crumbs}`

  if (REJECT_NAME_RE.test(name) || REJECT_NAME_RE.test(blob)) return false
  if (REJECT_CRUMB_RE.test(crumbs) && !KEEP_CRUMB_RE.test(crumbs)) return false
  if (CLOTHING_RE.test(name) && !KEEP_CRUMB_RE.test(crumbs)) return false
  if (!KEEP_CRUMB_RE.test(crumbs) && !KEEP_CRUMB_RE.test(blob)) return false
  return true
}

function phpToUsd(php: number | undefined | null): number | null {
  if (php == null || !Number.isFinite(php) || php <= 0) return null
  return round2(php / PHP_PER_USD)
}

async function fetchList(params: Record<string, string | number>): Promise<{
  NumProductFound: number
  Products: ZaloraProduct[]
}> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  const res = await fetch(`${API}?${qs}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      Origin: 'https://www.zalora.com.ph',
      Referer: 'https://www.zalora.com.ph/c/beauty',
    },
  })
  if (!res.ok) throw new Error(`Zalora API ${res.status} for ${qs}`)
  const json = (await res.json()) as { data: { NumProductFound: number; Products: ZaloraProduct[] } }
  return json.data
}

async function harvestAll(): Promise<Map<string, ZaloraProduct>> {
  const bySku = new Map<string, ZaloraProduct>()

  const ingest = (products: ZaloraProduct[]) => {
    for (const p of products) {
      const sku = (p.ConfigSku || '').trim()
      if (!sku || bySku.has(sku)) continue
      if (!isLifestyleCandidate(p)) continue
      if (!(p.MainImageUrl || p.ImageList?.[0])) continue
      bySku.set(sku, p)
    }
  }

  // Cap pages per broad category so harvest stays fast; beauty alone has 10k+
  const maxPerCategory = (id: number) => (id === 503 ? 480 : 288)

  for (const categoryId of CATEGORY_IDS) {
    if (bySku.size >= TARGET + 200) break
    let offset = 0
    let total = Infinity
    const cap = maxPerCategory(categoryId)
    while (offset < Math.min(total, cap)) {
      const data = await fetchList({ categoryId, limit: 48, offset })
      total = data.NumProductFound || 0
      const products = data.Products || []
      if (!products.length) break
      ingest(products)
      offset += 48
      await new Promise((r) => setTimeout(r, 100))
    }
    console.log(`  cat ${categoryId}: unique kept ${bySku.size}`)
  }

  for (const query of SEARCH_QUERIES) {
    if (bySku.size >= TARGET + 200) break
    let offset = 0
    let total = Infinity
    while (offset < Math.min(total, 144)) {
      const data = await fetchList({ query, limit: 48, offset })
      if (offset === 0) {
        total = data.NumProductFound || 0
        console.log(`  q=${JSON.stringify(query)} n=${total}`)
      }
      const products = data.Products || []
      if (!products.length) break
      ingest(products)
      offset += 48
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  return bySku
}

async function loadOrderedIds(ids: string[]): Promise<Set<string>> {
  const ordered = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const { data } = await supabase.from('order_items').select('productId').in('productId', chunk)
    for (const r of data || []) ordered.add(r.productId)
  }
  return ordered
}

async function main() {
  console.log(
    `Harvesting Zalora PH beauty/home lifestyle (target ${TARGET})${dryRun ? ' [DRY RUN]' : ''}…`
  )
  const harvested = await harvestAll()
  console.log(`Candidates after filter: ${harvested.size}`)

  if (harvested.size < TARGET) {
    console.error(`Only ${harvested.size} unique lifestyle products available (need ${TARGET}). Aborting.`)
    process.exit(1)
  }

  const ranked = [...harvested.values()].sort((a, b) => {
    const score = (p: ZaloraProduct) => {
      const c = (p.Breadcrumbs || []).join(' ').toLowerCase()
      let s = 0
      if (c.includes('skincare') || c.includes('skin care')) s += 5
      if (c.includes('fragrance') || c.includes('perfume')) s += 4
      if (c.includes('make up') || c.includes('makeup')) s += 4
      if (c.includes('bath') || c.includes('hair')) s += 3
      if (c.includes('home') || c.includes('kitchen') || c.includes('decor')) s += 3
      if (c.includes('grooming')) s += 2
      if (REJECT_NAME_RE.test(p.Name || '')) s -= 10
      return s
    }
    return score(b) - score(a) || a.Name.localeCompare(b.Name)
  })

  const selected: ZaloraProduct[] = []
  const usedImages = new Set<string>()
  const usedNames = new Set<string>()
  for (const p of ranked) {
    if (selected.length >= TARGET) break
    const img = (p.MainImageUrl || p.ImageList?.[0] || '').trim()
    const nameKey = `${(p.Brand || '').toLowerCase()} ${(p.Name || '').toLowerCase()}`.trim()
    if (!img || usedImages.has(img) || usedNames.has(nameKey)) continue
    usedImages.add(img)
    usedNames.add(nameKey)
    selected.push(p)
  }

  console.log(`Selected ${selected.length} unique name/image products`)

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  const catalogOut = {
    source: 'https://www.zalora.com.ph/c/beauty',
    scraped_at: new Date().toISOString(),
    php_per_usd: PHP_PER_USD,
    product_count: selected.length,
    products: selected.map((p) => {
      const salePhp = p.SpecialPriceInDecimal || p.PriceInDecimal || 0
      const listPhp = p.PriceInDecimal || salePhp
      return {
        sku: p.ConfigSku,
        name: p.Name,
        brand: p.Brand,
        category: (p.Breadcrumbs || []).join(' > '),
        price_usd: phpToUsd(salePhp),
        list_price_usd: phpToUsd(listPhp),
        image_url: p.MainImageUrl || p.ImageList?.[0],
        images: p.ImageList || [],
        product_url: p.ProductUrl
          ? `https://www.zalora.com.ph/${p.ProductUrl.replace(/^\//, '')}`
          : undefined,
        seller: p.SupplierName,
      }
    }),
  }
  writeFileSync(
    join(process.cwd(), 'catalog', 'zalora-ph-lifestyle.json'),
    JSON.stringify(catalogOut, null, 2)
  )
  console.log('Wrote catalog/zalora-ph-lifestyle.json')

  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('slug', CAT_SLUG)
    .single()
  if (catErr || !cat) {
    console.error('Lifestyle category missing', catErr)
    process.exit(1)
  }

  const { data: otherProducts } = await supabase
    .from('products')
    .select('id, name')
    .neq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const blockedNames = new Set((otherProducts || []).map((p) => p.name.toLowerCase()))
  const otherIds = (otherProducts || []).map((p) => p.id)
  const blockedImages = new Set<string>()
  for (let i = 0; i < otherIds.length; i += 60) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', otherIds.slice(i, i + 60))
      .eq('isPrimary', true)
    for (const r of imgs || []) blockedImages.add(r.url)
  }

  const finalList = selected.filter((p) => {
    const display =
      p.Brand && p.Name && !p.Name.toLowerCase().includes(p.Brand.toLowerCase())
        ? `${p.Brand} ${p.Name}`
        : p.Name
    const img = (p.MainImageUrl || p.ImageList?.[0] || '').trim()
    return !blockedNames.has(display.toLowerCase()) && !blockedImages.has(img)
  })

  if (finalList.length < TARGET) {
    console.warn(
      `After cross-category uniqueness: ${finalList.length} (wanted ${TARGET}). Using available set.`
    )
  }
  const toInsert = finalList.slice(0, TARGET)
  console.log(`Will insert ${toInsert.length} lifestyle products`)

  const { data: existing } = await supabase
    .from('products')
    .select('id, sku, status')
    .eq('categoryId', cat.id)
  const existingIds = (existing || []).map((p) => p.id)
  const ordered = await loadOrderedIds(existingIds)
  console.log(`Existing lifestyle: ${existingIds.length}; keep (orders): ${ordered.size}`)

  if (!dryRun) {
    const toArchive = existingIds.filter((id) => ordered.has(id))
    const toDelete = existingIds.filter((id) => !ordered.has(id))

    for (let i = 0; i < toArchive.length; i += 40) {
      const chunk = toArchive.slice(i, i + 40)
      await supabase
        .from('products')
        .update({ status: 'ARCHIVED', updatedAt: new Date().toISOString() })
        .in('id', chunk)
    }

    for (let i = 0; i < toDelete.length; i += 40) {
      const chunk = toDelete.slice(i, i + 40)
      await supabase.from('favorites').delete().in('productId', chunk)
      await supabase.from('product_images').delete().in('productId', chunk)
      const { error } = await supabase.from('products').delete().in('id', chunk)
      if (error) {
        console.warn('delete failed, archiving:', error.message)
        await supabase
          .from('products')
          .update({ status: 'ARCHIVED', updatedAt: new Date().toISOString() })
          .in('id', chunk)
      }
    }
    console.log(`Removed old lifestyle: deleted≈${toDelete.length}, archived=${toArchive.length}`)
  } else {
    console.log(`[dry] would remove ${existingIds.length - ordered.size} delete / ${ordered.size} archive`)
  }

  let inserted = 0
  let failed = 0
  const runTag = Date.now().toString(36)

  for (const p of toInsert) {
    const salePhp = Number(p.SpecialPriceInDecimal || p.PriceInDecimal || 0)
    const listPhp = Number(p.PriceInDecimal || salePhp)
    const salePrice = clamp(phpToUsd(salePhp) || PRICE_MIN)
    let compare = phpToUsd(listPhp) || round2(salePrice * 1.15)
    if (compare <= salePrice) compare = round2(Math.min(PRICE_MAX, salePrice * 1.15))
    compare = round2(Math.min(PRICE_MAX, compare))
    const wholesale = round2(wholesalePriceFromSales(salePrice))

    const displayName =
      p.Brand && p.Name && !p.Name.toLowerCase().includes(p.Brand.toLowerCase())
        ? `${p.Brand} ${p.Name}`
        : p.Name
    const sku = `ZLS-${p.ConfigSku}`.slice(0, 64)
    const slug = `${slugify(displayName) || 'zls'}-${runTag}-${createHash('sha1').update(sku).digest('hex').slice(0, 8)}`
    const crumbs = (p.Breadcrumbs || []).join(' > ')
    const imageUrl = (p.MainImageUrl || p.ImageList?.[0] || '').replace(/&amp;/g, '&')
    const gallery = (p.ImageList || [])
      .filter(Boolean)
      .slice(0, 4)
      .map((u) => u.replace(/&amp;/g, '&'))
    if (!gallery.includes(imageUrl) && imageUrl) gallery.unshift(imageUrl)

    const shortDesc = [p.Brand, crumbs].filter(Boolean).join(' · ').slice(0, 180)
    const description = [
      displayName,
      p.Brand ? `Brand: ${p.Brand}` : '',
      crumbs ? `Category: ${crumbs}` : '',
      p.SupplierName ? `Seller: ${p.SupplierName}` : '',
      p.ProductUrl ? `Source: https://www.zalora.com.ph/${p.ProductUrl.replace(/^\//, '')}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    if (dryRun) {
      if (inserted < 8 || inserted % 100 === 0) {
        console.log(`[dry] ${sku} $${salePrice} — ${displayName}`)
      }
      inserted++
      continue
    }

    const productId = randomUUID()
    const now = new Date().toISOString()
    const { error: insErr } = await supabase.from('products').insert({
      id: productId,
      shopId: null,
      categoryId: cat.id,
      name: displayName.slice(0, 200),
      slug,
      description,
      shortDesc: shortDesc || 'Lifestyle from Zalora PH',
      price: salePrice,
      salePrice,
      comparePrice: compare,
      costPrice: wholesale,
      wholesalePrice: wholesale,
      sku,
      stock: 40 + (inserted % 40),
      lowStockAlert: 5,
      status: 'PUBLISHED',
      isFeatured: inserted < 6,
      isPromoted: compare > salePrice,
      createdAt: now,
      updatedAt: now,
    })

    if (insErr) {
      console.error(`Fail ${sku}:`, insErr.message)
      failed++
      continue
    }

    const imgs = gallery.slice(0, 4).map((url, idx) => ({
      id: randomUUID(),
      productId,
      url,
      alt: displayName,
      sortOrder: idx,
      isPrimary: idx === 0,
    }))
    if (imgs.length) {
      const { error: imgErr } = await supabase.from('product_images').insert(imgs)
      if (imgErr) console.warn(`  image warn ${sku}:`, imgErr.message)
    }

    inserted++
    if (inserted % 50 === 0) console.log(`  … ${inserted} inserted, ${failed} failed`)
  }

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')

  const { count: carLeft } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
    .or(
      'name.ilike.%Pacifica%,name.ilike.%Durango%,name.ilike.%Charger%,name.ilike.%Hornet%,name.ilike.%Monster Jam%'
    )

  console.log('\n=== Lifestyle replace complete ===')
  console.log({ inserted, failed, dryRun, publishedLifestyle: count, carLikeLeft: carLeft })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
