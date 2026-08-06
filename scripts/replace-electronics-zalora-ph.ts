/**
 * Replace the Electronics category with ~500 products from zalora.com.ph
 * (Home Electronics + Men/Women Technology + tech search).
 *
 * - Admin catalog (shopId = null)
 * - SKU: ZEL-{ConfigSku}
 * - Prices: PHP → USD @ 61.26, clamped $10–$5000; wholesale = sales / 1.20
 * - Deletes current electronics products not referenced in order_items
 * - Archives ordered ones
 *
 * Run:
 *   npx tsx scripts/replace-electronics-zalora-ph.ts
 *   npx tsx scripts/replace-electronics-zalora-ph.ts --dry-run
 *   npx tsx scripts/replace-electronics-zalora-ph.ts --target=500
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
const TARGET = Math.max(100, parseInt(targetArg?.split('=')[1] || '500', 10) || 500)

const PHP_PER_USD = 61.26
const PRICE_MIN = 10
const PRICE_MAX = 5000
const CAT_SLUG = 'electronics'
const API = 'https://api.zalora.com.ph/v1/dynproducts/datajet/list'

/** Zalora PH category IDs for electronics / technology. */
const CATEGORY_IDS = [
  11080, // Home Electronics
  11031,
  7855, // Audio
  11046, // Electronic Accessories
  8218, // Home Appliances
  8219, // Vacuum
  8424, // Air purifiers
  7471, // Women Technology
  7462, // Men Technology
  1036, // Women Gadgets
  1079, // Men Gadgets
  8539, // Women Earphones
  11222, // Men Earphones
  5098, // Women Smart Watches
  5111, // Men Smart Watches
  8273, // Home Smart Watches
  1989, // Women Phone Cases
  2042, // Men Phone Cases
  1988, // Women Laptop Bags
  2041, // Men Laptop Bags
  5004, // Men Headphones
]

const SEARCH_QUERIES = [
  'earphones',
  'earbuds',
  'smart watch',
  'bluetooth speaker',
  'power bank',
  'phone case',
  'laptop sleeve',
  'wireless earbuds',
  'headphones',
  'charger',
  'usb cable',
  'gadget',
  'tablet case',
  'smartwatch',
  'tws',
  'portable speaker',
  'vacuum',
  'dyson',
  'air purifier',
  'humidifier',
  'technology',
  'fitness tracker',
  'wireless mouse',
  'keyboard',
  'microphone',
  'fast charging',
  'noise cancelling',
  'open ear',
  'powerbank',
  'magnetic charger',
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

const TECH_RE =
  /smart\s*watch|earphone|earbud|headphone|headset|speaker|power\s*bank|charger|cable|bluetooth|tws|gadget|phone\s*case|tablet\s*case|laptop|tablet|vacuum|dyson|humidifier|purifier|electronic|usb|wireless|camera|keyboard|mouse|adaptor|adapter|microphone|ktv|fitness\s*tracker|magsafe|airpods|ssd|router|hdmi|tripod|ring\s*light|open[- ]?ear|neckband|technology|audio|appliance/i

const CLOTHING_RE =
  /\b(trousers?|t-?shirts?|sweatpants|jeans|dresses?|skirts?|hoodies?|jackets?|coats?|blouses?|shirts?|shorts|leggings?|sandals?|sneakers?|boots?|heels?|polo)\b/i

const BAG_OK_RE = /laptop|sleeve|usb\s*charg|tablet\s*case|phone\s*case|tech\s*pouch/i
const NON_TECH_ACCESSORY_RE =
  /\b(card\s*pocket|card\s*holder|wallet|purse|duffel|travel\s*backpack|desk\s*caddy|jewellery|jewelry|bracelet|necklace|ring\b|perfume|argan\s*oil)\b/i

const KEEP_CRUMB_RE =
  /electronics|technology|gadgets?|smart\s*watches?|earphones?|headphones?|phone\s*&\s*tablet|laptop\s*bags?|audio|home\s*appliances?|vacuum|electronic\s*accessories|air\s*purifiers?/i

const REJECT_CRUMB_RE = /fashion\s*watches?/i

const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number) =>
  round2(Math.min(PRICE_MAX, Math.max(PRICE_MIN, Number.isFinite(n) && n > 0 ? n : PRICE_MIN)))
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

function isElectronicsCandidate(p: ZaloraProduct): boolean {
  const name = p.Name || ''
  const brand = p.Brand || ''
  const crumbs = (p.Breadcrumbs || []).join(' > ')
  const blob = `${brand} ${name} ${crumbs}`

  if (CLOTHING_RE.test(name) && !TECH_RE.test(blob)) return false
  if (REJECT_CRUMB_RE.test(crumbs) && !/smart/i.test(name)) return false
  if (NON_TECH_ACCESSORY_RE.test(name) && !TECH_RE.test(name)) return false

  // Fashion bag trees (not Technology/Electronics laptop bags): require tech signal in name
  const plainBagTree =
    /\bbags?\b|\bbackpack/i.test(crumbs) && !/technology|electronics|laptop/i.test(crumbs)
  if (plainBagTree && !BAG_OK_RE.test(name) && !TECH_RE.test(name)) return false

  if (KEEP_CRUMB_RE.test(crumbs)) return true
  if (TECH_RE.test(`${brand} ${name}`)) return true
  return false
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
      Referer: 'https://www.zalora.com.ph/',
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
      if (!isElectronicsCandidate(p)) continue
      if (!(p.MainImageUrl || p.ImageList?.[0])) continue
      bySku.set(sku, p)
    }
  }

  for (const categoryId of CATEGORY_IDS) {
    let offset = 0
    let total = Infinity
    while (offset < total) {
      const data = await fetchList({ categoryId, limit: 48, offset })
      total = data.NumProductFound || 0
      const products = data.Products || []
      if (!products.length) break
      ingest(products)
      offset += 48
      await new Promise((r) => setTimeout(r, 120))
    }
    console.log(`  cat ${categoryId}: unique kept ${bySku.size}`)
  }

  for (const query of SEARCH_QUERIES) {
    if (bySku.size >= TARGET + 150) break
    let offset = 0
    let total = Infinity
    let claimed = 0
    while (offset < Math.min(total, 240)) {
      const data = await fetchList({ query, limit: 48, offset })
      if (offset === 0) {
        claimed = data.NumProductFound || 0
        total = claimed
        console.log(`  q=${JSON.stringify(query)} n=${claimed}`)
      }
      const products = data.Products || []
      if (!products.length) break
      ingest(products)
      offset += 48
      await new Promise((r) => setTimeout(r, 120))
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
  console.log(`Harvesting Zalora PH electronics/tech (target ${TARGET})${dryRun ? ' [DRY RUN]' : ''}…`)
  const harvested = await harvestAll()
  console.log(`Candidates after filter: ${harvested.size}`)

  if (harvested.size < TARGET) {
    console.error(`Only ${harvested.size} unique tech products available (need ${TARGET}). Aborting.`)
    process.exit(1)
  }

  // Prefer Home Electronics / Technology breadcrumbs, then rest
  const ranked = [...harvested.values()].sort((a, b) => {
    const score = (p: ZaloraProduct) => {
      const c = (p.Breadcrumbs || []).join(' ').toLowerCase()
      let s = 0
      if (c.includes('electronics')) s += 5
      if (c.includes('technology') || c.includes('gadget')) s += 4
      if (c.includes('smart watch') || c.includes('earphone') || c.includes('audio')) s += 3
      if (c.includes('appliance') || c.includes('vacuum')) s += 2
      if (/fashion watch/.test(c)) s -= 3
      return s
    }
    return score(b) - score(a) || a.Name.localeCompare(b.Name)
  })

  // Unique primary images
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
    source: 'https://www.zalora.com.ph/',
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
    join(process.cwd(), 'catalog', 'zalora-ph-electronics-500.json'),
    JSON.stringify(catalogOut, null, 2)
  )
  console.log('Wrote catalog/zalora-ph-electronics-500.json')

  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('slug', CAT_SLUG)
    .single()
  if (catErr || !cat) {
    console.error('Electronics category missing', catErr)
    process.exit(1)
  }

  // Block images/names used by other categories so storefront dedupe stays clean
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
  console.log(`Will insert ${toInsert.length} electronics products`)

  const { data: existing } = await supabase.from('products').select('id, sku, status').eq('categoryId', cat.id)
  const existingIds = (existing || []).map((p) => p.id)
  const ordered = await loadOrderedIds(existingIds)
  console.log(`Existing electronics: ${existingIds.length}; keep (orders): ${ordered.size}`)

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
    console.log(`Removed old electronics: deleted≈${toDelete.length}, archived=${toArchive.length}`)
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
    const sku = `ZEL-${p.ConfigSku}`.slice(0, 64)
    const slug = `${slugify(displayName) || 'zel'}-${runTag}-${createHash('sha1').update(sku).digest('hex').slice(0, 8)}`
    const crumbs = (p.Breadcrumbs || []).join(' > ')
    const imageUrl = (p.MainImageUrl || p.ImageList?.[0] || '').replace(/&amp;/g, '&')
    const gallery = (p.ImageList || []).filter(Boolean).slice(0, 4).map((u) => u.replace(/&amp;/g, '&'))
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
      shortDesc: shortDesc || 'Electronics from Zalora PH',
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

  console.log('\n=== Electronics replace complete ===')
  console.log({ inserted, failed, dryRun, publishedElectronics: count })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
