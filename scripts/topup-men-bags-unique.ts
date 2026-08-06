/**
 * Top up men-bags to >=101 with variant-unique Zalora PH men's bags.
 * Blocks products whose variantKey matches any existing published product,
 * so colorway duplicates are never re-introduced.
 *
 * Run: npx tsx scripts/topup-men-bags-unique.ts
 */
import { createHash, randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { wholesalePriceFromSales } from '../src/lib/wholesale-pricing'
import { variantKey } from './dedupe-category-variants'

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
    /* env */
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MIN = 101
const PHP_PER_USD = 61.26
const PRICE_MIN = 10
const PRICE_MAX = 5000
const API = 'https://api.zalora.com.ph/v1/dynproducts/datajet/list'

const QUERIES = [
  'men backpack',
  'men sling bag',
  'men messenger bag',
  'men briefcase',
  'men tote',
  'men duffel',
  'leather bag men',
  'men waist bag',
  'laptop backpack',
  'travel backpack men',
]

type ZP = {
  ConfigSku: string
  Name: string
  Brand?: string
  PriceInDecimal?: number
  SpecialPriceInDecimal?: number
  MainImageUrl?: string
  ImageList?: string[]
  Breadcrumbs?: string[]
  ProductUrl?: string
  SupplierName?: string
}

const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number) =>
  round2(Math.min(PRICE_MAX, Math.max(PRICE_MIN, Number.isFinite(n) && n > 0 ? n : PRICE_MIN)))
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)

async function fetchList(params: Record<string, string | number>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  const res = await fetch(`${API}?${qs}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0.0.0',
      Origin: 'https://www.zalora.com.ph',
      Referer: 'https://www.zalora.com.ph/',
    },
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return (await res.json()).data as { NumProductFound: number; Products: ZP[] }
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'men-bags').single()
  if (!cat) throw new Error('men-bags missing')

  const { count: current } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const need = Math.max(0, MIN - (current || 0))
  console.log(`men-bags published: ${current}; need: ${need}`)
  if (!need) return

  // Block variant keys + images across ALL published products
  const usedKeys = new Set<string>()
  const usedImages = new Set<string>()
  const usedSkus = new Set<string>()
  let from = 0
  const allIds: string[] = []
  while (true) {
    const { data } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('status', 'PUBLISHED')
      .range(from, from + 999)
    if (!data?.length) break
    for (const p of data) {
      usedKeys.add(variantKey(p.name))
      if (p.sku) usedSkus.add(p.sku)
      allIds.push(p.id)
    }
    from += 1000
    if (data.length < 1000) break
  }
  for (let i = 0; i < allIds.length; i += 80) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', allIds.slice(i, i + 80))
      .eq('isPrimary', true)
    for (const r of imgs || []) usedImages.add(r.url)
  }
  console.log(`blocked keys=${usedKeys.size} images=${usedImages.size}`)

  const picks: ZP[] = []
  const seenSku = new Set<string>()

  outer: for (const q of QUERIES) {
    let offset = 0
    let total = Infinity
    while (offset < Math.min(total, 192)) {
      const d = await fetchList({ query: q, limit: 48, offset })
      if (offset === 0) total = d.NumProductFound || 0
      const products = d.Products || []
      if (!products.length) break
      for (const p of products) {
        if (picks.length >= need + 5) break outer
        const sku = `ZMB-${p.ConfigSku}`
        if (!p.ConfigSku || seenSku.has(p.ConfigSku) || usedSkus.has(sku)) continue
        const crumbs = (p.Breadcrumbs || []).join(' > ')
        if (!/^Men\s*>\s*Bags|Men's.*Bags|Sports\s*>\s*Men/i.test(crumbs) && !/\bmen\b/i.test(crumbs)) continue
        if (!/bags?|backpack/i.test(crumbs)) continue
        if (/women/i.test(crumbs)) continue
        const img = p.MainImageUrl || p.ImageList?.[0]
        if (!img || usedImages.has(img)) continue
        const key = variantKey(p.Name)
        if (!key || usedKeys.has(key)) continue
        usedKeys.add(key)
        usedImages.add(img)
        seenSku.add(p.ConfigSku)
        picks.push(p)
      }
      offset += 48
      await new Promise((r) => setTimeout(r, 100))
    }
    console.log(`  q=${JSON.stringify(q)} picks=${picks.length}`)
  }

  console.log(`Unique candidates: ${picks.length}`)
  let inserted = 0
  const runTag = Date.now().toString(36)

  for (const p of picks.slice(0, need)) {
    const salePhp = Number(p.SpecialPriceInDecimal || p.PriceInDecimal || 0)
    const listPhp = Number(p.PriceInDecimal || salePhp)
    const salePrice = clamp(salePhp / PHP_PER_USD)
    let compare = round2(listPhp / PHP_PER_USD)
    if (!Number.isFinite(compare) || compare <= salePrice) compare = round2(salePrice * 1.15)
    compare = round2(Math.min(PRICE_MAX, compare))
    const wholesale = round2(wholesalePriceFromSales(salePrice))

    const displayName =
      p.Brand && p.Name && !p.Name.toLowerCase().includes(p.Brand.toLowerCase())
        ? `${p.Brand} ${p.Name}`
        : p.Name
    const sku = `ZMB-${p.ConfigSku}`.slice(0, 64)
    const slug = `${slugify(displayName) || 'zmb'}-${runTag}-${createHash('sha1').update(sku).digest('hex').slice(0, 8)}`
    const crumbs = (p.Breadcrumbs || []).join(' > ')
    const imageUrl = (p.MainImageUrl || p.ImageList?.[0] || '').replace(/&amp;/g, '&')
    const gallery = (p.ImageList || []).filter(Boolean).slice(0, 4).map((u) => u.replace(/&amp;/g, '&'))
    if (!gallery.includes(imageUrl) && imageUrl) gallery.unshift(imageUrl)

    const productId = randomUUID()
    const now = new Date().toISOString()
    const { error } = await supabase.from('products').insert({
      id: productId,
      shopId: null,
      categoryId: cat.id,
      name: displayName.slice(0, 200),
      slug,
      description: [displayName, p.Brand ? `Brand: ${p.Brand}` : '', crumbs ? `Category: ${crumbs}` : '']
        .filter(Boolean)
        .join('\n'),
      shortDesc: [p.Brand, crumbs].filter(Boolean).join(' · ').slice(0, 180) || 'Men bag from Zalora PH',
      price: salePrice,
      salePrice,
      comparePrice: compare,
      costPrice: wholesale,
      wholesalePrice: wholesale,
      sku,
      stock: 30 + (inserted % 30),
      lowStockAlert: 5,
      status: 'PUBLISHED',
      isFeatured: false,
      isPromoted: compare > salePrice,
      createdAt: now,
      updatedAt: now,
    })
    if (error) {
      console.warn(`fail ${sku}: ${error.message}`)
      continue
    }
    await supabase.from('product_images').insert(
      gallery.slice(0, 4).map((url, idx) => ({
        id: randomUUID(),
        productId,
        url,
        alt: displayName,
        sortOrder: idx,
        isPrimary: idx === 0,
      }))
    )
    inserted++
  }

  const { count: after } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  console.log(`Inserted ${inserted}; men-bags now ${after}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
