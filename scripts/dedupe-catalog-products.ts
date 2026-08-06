/**
 * Remove repeated catalog products:
 *  1) duplicate SKU
 *  2) shared primary image URL
 *  3) exact duplicate name
 *
 * Keeps the oldest row; never deletes products referenced in order_items
 * (those extras are ARCHIVED instead).
 *
 * Run:
 *   npx tsx scripts/dedupe-catalog-products.ts
 *   npx tsx scripts/dedupe-catalog-products.ts --dry-run
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

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

const dryRun = process.argv.includes('--dry-run')
const noTopup = process.argv.includes('--no-topup')
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: (i, init) => fetch(i, { ...init, cache: 'no-store' }) } }
)

type Product = {
  id: string
  name: string
  sku: string | null
  status: string
  categoryId: string
  createdAt: string
  shopId: string | null
}

function normUrl(u: string): string {
  if (!u) return ''
  try {
    const cleaned = u.replace(/&amp;/g, '&').trim()
    const url = new URL(cleaned)
    url.searchParams.delete('width')
    url.searchParams.delete('format')
    url.searchParams.delete('w')
    url.searchParams.delete('q')
    url.searchParams.delete('auto')
    const href = url.href
    const m = href.match(/https:\/\/static[^/\s]*zacdn\.com\/[^\s?]+/i)
    if (m) return m[0].toLowerCase()
    // nooncdn path without query
    return (url.origin + url.pathname).toLowerCase()
  } catch {
    return u.replace(/&amp;/g, '&').split('?')[0].toLowerCase()
  }
}

async function loadPublished(): Promise<Product[]> {
  const rows: Product[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, status, categoryId, createdAt, shopId')
      .eq('status', 'PUBLISHED')
      .range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    rows.push(...(data as Product[]))
    if (data.length < 1000) break
    from += 1000
  }
  return rows
}

async function loadPrimaryImages(productIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (let i = 0; i < productIds.length; i += 80) {
    const chunk = productIds.slice(i, i + 80)
    const { data } = await supabase
      .from('product_images')
      .select('productId, url, isPrimary, sortOrder')
      .in('productId', chunk)
    const byProd = new Map<string, { url: string; isPrimary: boolean; sortOrder: number }[]>()
    for (const img of data || []) {
      if (!byProd.has(img.productId)) byProd.set(img.productId, [])
      byProd.get(img.productId)!.push(img)
    }
    for (const [pid, imgs] of byProd) {
      imgs.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
      if (imgs[0]?.url) map.set(pid, imgs[0].url)
    }
  }
  return map
}

async function loadOrderedProductIds(ids: string[]): Promise<Set<string>> {
  const blocked = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const { data } = await supabase.from('order_items').select('productId').in('productId', chunk)
    for (const r of data || []) blocked.add(r.productId)
  }
  return blocked
}

/**
 * Pick a single keeper from a duplicate group.
 * Prefer an ordered row (oldest), then oldest overall.
 * Other ordered extras are still "dropped" → ARCHIVED (kept for order history,
 * hidden from storefront).
 */
function pickKeepers(group: Product[], ordered: Set<string>): { keep: Set<string>; drop: string[] } {
  const sorted = [...group].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const orderedSorted = sorted.filter((p) => ordered.has(p.id))
  const keeper = orderedSorted[0] || sorted[0]
  const keep = new Set<string>([keeper.id])
  const drop = group.filter((p) => p.id !== keeper.id).map((p) => p.id)
  return { keep, drop }
}

async function removeProducts(ids: string[], ordered: Set<string>) {
  const toArchive = ids.filter((id) => ordered.has(id))
  const toDelete = ids.filter((id) => !ordered.has(id))

  if (dryRun) {
    console.log(`[dry] would delete ${toDelete.length}, archive ${toArchive.length}`)
    return { deleted: toDelete.length, archived: toArchive.length }
  }

  let deleted = 0
  let archived = 0

  for (let i = 0; i < toArchive.length; i += 40) {
    const chunk = toArchive.slice(i, i + 40)
    const { error } = await supabase
      .from('products')
      .update({ status: 'ARCHIVED', updatedAt: new Date().toISOString() })
      .in('id', chunk)
    if (error) console.warn('archive error', error.message)
    else archived += chunk.length
  }

  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    // favorites / images first
    await supabase.from('favorites').delete().in('productId', chunk)
    await supabase.from('product_images').delete().in('productId', chunk)
    const { error } = await supabase.from('products').delete().in('id', chunk)
    if (error) {
      // fallback archive if FK blocks delete
      console.warn('delete failed, archiving instead:', error.message)
      const { error: aerr } = await supabase
        .from('products')
        .update({ status: 'ARCHIVED', updatedAt: new Date().toISOString() })
        .in('id', chunk)
      if (aerr) console.warn('archive fallback failed', aerr.message)
      else archived += chunk.length
    } else {
      deleted += chunk.length
    }
  }

  return { deleted, archived }
}

async function main() {
  let products = await loadPublished()
  console.log('Published before:', products.length)

  const ordered = await loadOrderedProductIds(products.map((p) => p.id))
  console.log('Products referenced in orders:', ordered.size)

  const drop = new Set<string>()
  const markDrops = (ids: string[]) => {
    let n = 0
    for (const id of ids) {
      if (drop.has(id)) continue
      drop.add(id)
      n++
    }
    return n
  }

  // 1) Duplicate SKU
  const bySku = new Map<string, Product[]>()
  for (const p of products) {
    const sku = (p.sku || '').trim()
    if (!sku) continue
    if (!bySku.has(sku)) bySku.set(sku, [])
    bySku.get(sku)!.push(p)
  }
  let skuGroups = 0
  let skuMarked = 0
  for (const [, group] of bySku) {
    if (group.length < 2) continue
    skuGroups++
    const { drop: d } = pickKeepers(group, ordered)
    skuMarked += markDrops(d)
  }
  console.log(`Duplicate SKU groups: ${skuGroups} → marked ${skuMarked}`)

  const alive = () => products.filter((p) => !drop.has(p.id))

  // 2) Shared primary image
  const primary = await loadPrimaryImages(alive().map((p) => p.id))
  const byImg = new Map<string, Product[]>()
  for (const p of alive()) {
    const url = primary.get(p.id)
    if (!url) continue
    const key = normUrl(url)
    if (!key) continue
    if (!byImg.has(key)) byImg.set(key, [])
    byImg.get(key)!.push(p)
  }
  let imgGroups = 0
  let imgMarked = 0
  for (const [, group] of byImg) {
    if (group.length < 2) continue
    imgGroups++
    const { drop: d } = pickKeepers(group, ordered)
    imgMarked += markDrops(d)
  }
  console.log(`Shared primary-image groups: ${imgGroups} → marked ${imgMarked}`)

  // 3) Exact name (case-insensitive)
  const byName = new Map<string, Product[]>()
  for (const p of alive()) {
    const name = (p.name || '').trim().toLowerCase()
    if (!name) continue
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name)!.push(p)
  }
  let nameGroups = 0
  let nameMarked = 0
  for (const [, group] of byName) {
    if (group.length < 2) continue
    nameGroups++
    const { drop: d } = pickKeepers(group, ordered)
    nameMarked += markDrops(d)
  }
  console.log(`Exact name duplicate groups: ${nameGroups} → marked ${nameMarked}`)

  console.log('\nTotal to remove:', drop.size)
  const { deleted, archived } = await removeProducts([...drop], ordered)
  console.log(`Done. deleted=${deleted} archived=${archived}${dryRun ? ' (dry-run)' : ''}`)

  products = await loadPublished()
  console.log('Published after:', products.length)

  // Category counts
  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('isActive', true)
    .is('parentId', null)
  const counts = new Map<string, number>()
  for (const c of cats || []) counts.set(c.slug, 0)
  const idToSlug = new Map((cats || []).map((c) => [c.id, c.slug]))
  for (const p of products) {
    const slug = idToSlug.get(p.categoryId)
    if (slug) counts.set(slug, (counts.get(slug) || 0) + 1)
  }
  console.log('\nCategory counts:')
  let below = 0
  for (const [slug, n] of [...counts.entries()].sort((a, b) => a[1] - b[1])) {
    const ok = n > 100
    if (!ok) below++
    console.log(`  ${ok ? '✅' : '❌'} ${String(n).padStart(4)}  ${slug}`)
  }

  // Quick uniqueness check
  const primary2 = await loadPrimaryImages(products.map((p) => p.id))
  const seenSku = new Set<string>()
  const seenName = new Set<string>()
  const seenImg = new Set<string>()
  let dSku = 0,
    dName = 0,
    dImg = 0
  for (const p of products) {
    const sku = (p.sku || '').trim()
    if (sku) {
      if (seenSku.has(sku)) dSku++
      else seenSku.add(sku)
    }
    const name = (p.name || '').trim()
    if (name) {
      if (seenName.has(name)) dName++
      else seenName.add(name)
    }
    const img = normUrl(primary2.get(p.id) || '')
    if (img) {
      if (seenImg.has(img)) dImg++
      else seenImg.add(img)
    }
  }
  console.log('\nRemaining extras:', { duplicateSkus: dSku, duplicateNames: dName, sharedPrimaryImages: dImg })

  if (below > 0 && !dryRun && !noTopup) {
    console.log(`\n${below} categories below 101 — running ensure-categories-min-100…`)
    const { spawnSync } = await import('child_process')
    const res = spawnSync('npx', ['tsx', 'scripts/ensure-categories-min-100.ts'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    if (res.stdout) process.stdout.write(res.stdout)
    if (res.stderr) process.stderr.write(res.stderr)
    if (res.status !== 0) process.exit(res.status || 1)
  } else if (below > 0) {
    console.log(
      `\n${below} categories below 101${dryRun || noTopup ? ' (top-up skipped)' : ''}.`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
