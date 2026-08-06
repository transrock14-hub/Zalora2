/**
 * Delete Lifestyle Pick/Select near-duplicates, then top up with unique Makeup API SKUs (>700).
 * Run: npx tsx scripts/dedupe-and-topup-makeup.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { salesPriceFromWholesale, wholesalePriceFromSales } from '../src/lib/wholesale-pricing'

function loadEnv() {
  const envRaw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  for (const line of envRaw.split('\n')) {
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

const GOAL = 720
const CONCURRENCY = 12
/** Only our filler suffixes — not legitimate names like "Eyeshadow Collection" */
const SUFFIX =
  /\s+(lifestyle pick|lifestyle select|studio view|detail shot|alt angle|pack shot)(\s+\d+)?$/i
const SELECT_ONLY = /\s+select(\s+\d+)?$/i
const COLLECTION_FILLER = /\s+collection(\s+\d+)?$/i

function isFillerName(name: string, allNames: Set<string>): boolean {
  const n = name.trim()
  if (SUFFIX.test(n)) return true
  // "Foo Select" only if bare "Foo" also exists
  if (SELECT_ONLY.test(n)) {
    const base = n.replace(SELECT_ONLY, '').trim().toLowerCase()
    return allNames.has(base)
  }
  // "Foo Collection" only if bare "Foo" also exists (DummyJSON pad) — not brand collections
  if (COLLECTION_FILLER.test(n)) {
    const base = n.replace(COLLECTION_FILLER, '').trim().toLowerCase()
    return allNames.has(base)
  }
  return false
}

const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)

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

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
}

async function loadPublished() {
  const products: { id: string; name: string; categoryId: string }[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('products')
      .select('id, name, categoryId')
      .eq('status', 'PUBLISHED')
      .range(from, from + 999)
    if (!data?.length) break
    products.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  return products
}

function priceFor(i: number) {
  const bands = [
    [305, 800],
    [801, 2500],
    [2501, 3000],
    [3001, 4000],
    [4001, 5000],
  ]
  const b = bands[i % bands.length]
  const t = ((i * 17) % 100) / 99
  return round2(b[0] + (b[1] - b[0]) * t)
}

async function main() {
  const products = await loadPublished()
  console.log('Before:', products.length)

  const nameSet = new Set(products.map((p) => p.name.trim().toLowerCase()))
  const toDelete = products.filter((p) => isFillerName(p.name, nameSet))
  console.log('Filler listings to delete:', toDelete.length)

  const delIds = toDelete.map((p) => p.id)
  const blocked = new Set<string>()
  for (let i = 0; i < delIds.length; i += 40) {
    const { data: oi } = await supabase
      .from('order_items')
      .select('productId')
      .in('productId', delIds.slice(i, i + 40))
    for (const r of oi || []) blocked.add(r.productId)
  }
  const safe = delIds.filter((id) => !blocked.has(id))
  console.log('Safe delete:', safe.length, 'order-blocked:', blocked.size)

  for (let i = 0; i < safe.length; i += 40) {
    const chunk = safe.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    const { error } = await supabase.from('products').delete().in('id', chunk)
    if (error) throw error
  }
  console.log('Deleted', safe.length)

  const remaining = await loadPublished()
  console.log('After delete:', remaining.length)
  const need = Math.max(0, GOAL - remaining.length)
  console.log('Need insert:', need)

  const { data: cats } = await supabase.from('categories').select('id, slug')
  const catId = new Map((cats || []).map((c) => [c.slug, c.id]))
  const accId = catId.get('accessories')!
  const lifeId = catId.get('lifestyle')!

  const usedNames = new Set(remaining.map((p) => p.name.toLowerCase()))
  const usedImgs = new Set<string>()
  const ids = remaining.map((p) => p.id)
  for (let i = 0; i < ids.length; i += 80) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', ids.slice(i, i + 80))
    for (const r of imgs || []) usedImgs.add(r.url)
  }

  console.log('Loading Makeup API...')
  const makeup = (await (
    await fetch('https://makeup-api.herokuapp.com/api/v1/products.json')
  ).json()) as any[]

  type Item = { name: string; description: string; image: string }
  const candidates: Item[] = []
  for (const p of makeup || []) {
    const base = String(p.name || '').trim()
    const image = String(p.image_link || '').trim()
    if (!base || !image.startsWith('http')) continue
    const brand = String(p.brand || '').trim()
    const name = (brand ? `${brand} ${base}` : base).slice(0, 120)
    if (usedNames.has(name.toLowerCase()) || usedImgs.has(image)) continue
    candidates.push({
      name,
      description: String(p.description || `${name} — beauty product.`).slice(0, 2000),
      image,
    })
  }
  console.log('Unused makeup candidates:', candidates.length)

  const validated: Item[] = []
  await mapPool(candidates, CONCURRENCY, async (item) => {
    if (validated.length >= need + 40) return
    if (usedNames.has(item.name.toLowerCase()) || usedImgs.has(item.image)) return
    if (!(await urlOk(item.image))) return
    if (usedNames.has(item.name.toLowerCase()) || usedImgs.has(item.image)) return
    usedNames.add(item.name.toLowerCase())
    usedImgs.add(item.image)
    validated.push(item)
  })
  console.log('Validated:', validated.length)

  const pick = validated.slice(0, need)
  const runTag = Date.now().toString(36)
  let inserted = 0

  console.log(`Inserting ${pick.length}...`)
  for (let i = 0; i < pick.length; i++) {
    const item = pick[i]
    const categoryId = i % 2 === 0 ? accId : lifeId
    const sale = priceFor(i)
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId,
        name: item.name,
        slug: `mk2-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.name.slice(0, 160),
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `MK2-${String(i + 1).padStart(4, '0')}-${runTag}`,
        stock: 10 + (i % 30),
        lowStockAlert: 4,
        status: 'PUBLISHED',
        rating: round2(3.8 + (i % 12) * 0.1),
        totalReviews: 4 + (i % 25),
        totalSales: i % 15,
        views: 20 + i * 2,
      })
      .select('id')
      .single()

    if (error || !product) {
      console.warn('insert fail', error?.message)
      continue
    }

    const { error: imgErr } = await supabase.from('product_images').insert({
      productId: product.id,
      url: item.image,
      alt: item.name,
      sortOrder: 0,
      isPrimary: true,
    })
    if (imgErr) {
      await supabase.from('products').delete().eq('id', product.id)
      continue
    }
    inserted++
    if (inserted % 25 === 0) console.log(`  … ${inserted}/${pick.length}`)
  }

  const final = await loadPublished()
  const finalNames = new Set(final.map((p) => p.name.trim().toLowerCase()))
  const still = final.filter((p) => isFillerName(p.name, finalNames))
  const fids = final.map((p) => p.id)
  const urls: string[] = []
  for (let i = 0; i < fids.length; i += 80) {
    const { data } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', fids.slice(i, i + 80))
      .eq('isPrimary', true)
    for (const r of data || []) urls.push(r.url)
  }

  console.log('\n=== DONE ===')
  console.log('Deleted fillers:', safe.length)
  console.log('Inserted makeup:', inserted)
  console.log('TOTAL published:', final.length)
  console.log('Unique names:', new Set(final.map((p) => p.name.toLowerCase())).size)
  console.log('Unique primary images:', new Set(urls).size)
  console.log('Remaining suffix fillers:', still.length)
  console.log('Above 700:', final.length >= 700)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
