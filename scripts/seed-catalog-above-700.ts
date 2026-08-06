/**
 * Grow published catalog above 700 using Makeup API (matched name + image)
 * plus leftover DummyJSON frames. Does NOT create Core/Pro shoe clones.
 * Keeps existing products; only inserts new unique image/name rows.
 *
 * Run: npx tsx scripts/seed-catalog-above-700.ts
 */
import { readFileSync } from 'fs'
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

const GOAL = 720
const CONCURRENCY = 12
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

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

function salesPriceForIndex(i: number): number {
  // Spread across $300–$5000
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

type Cand = {
  name: string
  description: string
  image: string
  categorySlug: string
  source: string
}

async function main() {
  const { count: before } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PUBLISHED')
  console.log('Published before:', before)
  const need = Math.max(0, GOAL - (before || 0))
  if (need <= 0) {
    console.log('Already at goal')
    return
  }
  console.log('Need to insert:', need)

  const { data: cats } = await supabase.from('categories').select('id, slug, name')
  const catId = new Map((cats || []).map((c) => [c.slug, c.id]))
  const thinOrder = [
    'men-bags',
    'women-bags',
    'men-clothing',
    'women-shoes',
    'men-shoes',
    'women-clothing',
    'girls',
    'boys',
    'electronics',
    'accessories',
    'home-garden',
    'lifestyle',
  ]

  const { data: allP } = await supabase.from('products').select('id, name, categoryId')
  const usedNames = new Set((allP || []).map((p) => p.name.toLowerCase()))
  const usedImgs = new Set<string>()
  const ids = (allP || []).map((p) => p.id)
  for (let i = 0; i < ids.length; i += 80) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('url')
      .in('productId', ids.slice(i, i + 80))
    for (const r of imgs || []) usedImgs.add(r.url)
  }

  // Current counts per category (for preferential fill of thin ones)
  const countByCat = new Map<string, number>()
  for (const c of cats || []) countByCat.set(c.slug, 0)
  for (const p of allP || []) {
    const slug = (cats || []).find((c) => c.id === p.categoryId)?.slug
    if (slug) countByCat.set(slug, (countByCat.get(slug) || 0) + 1)
  }

  console.log('Loading Makeup API (~931 products)...')
  const makeup = (await (
    await fetch('https://makeup-api.herokuapp.com/api/v1/products.json')
  ).json()) as any[]

  const rawMakeup: Array<{ name: string; description: string; image: string; type: string; brand: string }> =
    []
  for (const p of makeup || []) {
    const name = String(p.name || '').trim()
    const image = String(p.image_link || '').trim()
    if (!name || !image) continue
    if (!image.startsWith('http')) continue
    if (/placeholder|missing|null/i.test(image)) continue
    const brand = String(p.brand || '').trim()
    const fullName = brand ? `${brand} ${name}` : name
    rawMakeup.push({
      name: fullName.slice(0, 120),
      description: String(p.description || `${fullName} — beauty product.`).slice(0, 2000),
      image,
      type: String(p.product_type || 'makeup'),
      brand,
    })
  }
  console.log('Makeup candidates raw:', rawMakeup.length)

  // Validate images in parallel (stop once we have enough uniques)
  console.log('Validating images (this may take a few minutes)...')
  const validated: typeof rawMakeup = []
  await mapPool(rawMakeup, CONCURRENCY, async (item) => {
    if (validated.length >= need + 80) return
    if (usedNames.has(item.name.toLowerCase())) return
    if (usedImgs.has(item.image)) return
    if (!(await urlOk(item.image))) return
    // re-check after await
    if (usedNames.has(item.name.toLowerCase()) || usedImgs.has(item.image)) return
    usedNames.add(item.name.toLowerCase())
    usedImgs.add(item.image)
    validated.push(item)
  })
  console.log('Validated unique makeup:', validated.length)

  function pickCategory(i: number, type: string): string {
    // Beauty → accessories / lifestyle; also top up thinnest cats with soft goods only for bags/clothing thin ones stay makeup-free
    const beautySlugs = ['accessories', 'lifestyle']
    // Prefer categories still under target floors
    const floors: Record<string, number> = {
      accessories: 120,
      lifestyle: 180,
      'home-garden': 60,
      electronics: 45,
      boys: 30,
      girls: 20,
      'women-clothing': 25,
      'men-clothing': 20,
      'women-bags': 15,
      'men-bags': 12,
      'women-shoes': 15,
      'men-shoes': 15,
    }
    // Makeup stays in accessories/lifestyle only (matched product type)
    if (/lipstick|lip_liner|foundation|mascara|eyeliner|eyeshadow|blush|bronzer|nail_polish|concealer/i.test(type)) {
      for (const s of beautySlugs) {
        if ((countByCat.get(s) || 0) < (floors[s] || 100)) return s
      }
      return i % 2 === 0 ? 'accessories' : 'lifestyle'
    }
    for (const s of thinOrder) {
      if ((countByCat.get(s) || 0) < (floors[s] || 40)) {
        // don't dump mascara into shoes/bags
        if (/shoe|bag|clothing|boys|girls|electronics|home/i.test(s)) continue
        return s
      }
    }
    return beautySlugs[i % 2]
  }

  const cands: Cand[] = []
  for (let i = 0; i < validated.length && cands.length < need; i++) {
    const item = validated[i]
    const slug = pickCategory(i, item.type)
    if (!catId.has(slug)) continue
    countByCat.set(slug, (countByCat.get(slug) || 0) + 1)
    cands.push({
      name: item.name,
      description: item.description,
      image: item.image,
      categorySlug: slug,
      source: `makeup-${i}`,
    })
  }

  // DummyJSON leftover unique frames (non-shoe) if still short
  if (cands.length < need) {
    console.log('Topping from DummyJSON unused frames...')
    const dj = (await (await fetch('https://dummyjson.com/products?limit=250')).json()) as {
      products: any[]
    }
    for (const p of dj.products || []) {
      if (cands.length >= need) break
      if (/shoes/i.test(p.category)) continue
      const imgs = [...(p.images || []), p.thumbnail].filter(Boolean) as string[]
      for (const img of imgs) {
        if (cands.length >= need) break
        if (usedImgs.has(img)) continue
        if (!(await urlOk(img))) continue
        let name = String(p.title).trim()
        if (usedNames.has(name.toLowerCase())) {
          name = `${name} Collection`
          let n = 2
          while (usedNames.has(name.toLowerCase())) name = `${p.title} Collection ${n++}`
        }
        usedNames.add(name.toLowerCase())
        usedImgs.add(img)
        const slug =
          /kitchen|furniture|home|grocer/i.test(p.category)
            ? 'home-garden'
            : /phone|laptop|tablet|mobile/i.test(p.category)
              ? 'electronics'
              : /watch|jewel|sunglass|beauty|fragrance|skin/i.test(p.category)
                ? 'accessories'
                : /sport|motor/i.test(p.category)
                  ? 'boys'
                  : 'lifestyle'
        cands.push({
          name,
          description: p.description || name,
          image: img,
          categorySlug: slug,
          source: `dj-${p.id}`,
        })
      }
    }
  }

  console.log(`Inserting ${cands.length} products...`)
  const runTag = Date.now().toString(36)
  let inserted = 0
  let failed = 0

  for (let i = 0; i < cands.length; i++) {
    const item = cands[i]
    const categoryId = catId.get(item.categorySlug)
    if (!categoryId) continue

    const sale = salesPriceForIndex(i)
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId,
        name: item.name,
        slug: `mk-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.name.slice(0, 160),
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.12),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `MK-${String(i + 1).padStart(4, '0')}-${runTag}`,
        stock: 8 + (i % 40),
        lowStockAlert: 4,
        status: 'PUBLISHED',
        isFeatured: i < 12,
        isPromoted: i % 11 === 0,
        rating: round2(3.7 + (i % 14) * 0.1),
        totalReviews: 3 + (i % 40),
        totalSales: i % 20,
        views: 15 + i * 2,
      })
      .select('id')
      .single()

    if (error || !product) {
      failed++
      if (failed < 5) console.warn('insert fail', error?.message)
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
      failed++
      continue
    }

    inserted++
    if (inserted % 50 === 0) console.log(`  … ${inserted}/${cands.length}`)
  }

  // Final audit
  const { data: cats2 } = await supabase.from('categories').select('id, name').order('sortOrder')
  let total = 0
  console.log('\n=== After seed ===')
  for (const c of cats2 || []) {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('categoryId', c.id)
      .eq('status', 'PUBLISHED')
    total += count || 0
    console.log(`${String(count).padStart(4)}  ${c.name}`)
  }
  console.log('TOTAL', total, 'inserted', inserted, 'failed', failed)
  if (total < 700) {
    console.warn('Still under 700 — check makeup image failures')
  } else {
    console.log('Goal reached: >700 products')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
