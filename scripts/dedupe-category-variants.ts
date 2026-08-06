/**
 * Remove color / gift-set / strap near-duplicates within a category.
 * Keeps one product per normalized variant key (prefer ordered, then oldest).
 * Ordered extras are ARCHIVED; others deleted.
 *
 * Run:
 *   npx tsx scripts/dedupe-category-variants.ts --slug=electronics
 *   npx tsx scripts/dedupe-category-variants.ts --slug=lifestyle --dry-run
 *   npx tsx scripts/dedupe-category-variants.ts --slug=electronics,lifestyle
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
const slugArg = process.argv.find((a) => a.startsWith('--slug='))
const slugs = (slugArg?.split('=')[1] || 'electronics')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: (i, init) => fetch(i, { ...init, cache: 'no-store' }) } }
)

type Product = {
  id: string
  name: string
  sku: string | null
  createdAt: string
  categoryId: string
}

const COLOR_RE =
  /\b(blacks?|whites?|pinks?|purples?|deep\s*purple|pastel\s*purple|greys?|grays?|silvers?|golds?|blues?|reds?|greens?|yellows?|frost|ivory|khaki|navy|beige|browns?|oranges?|roses?|mints?|ash|slate|clay|spruce|eucalyptus|bronze|rust|nightsky|caramel|hibiscus|toffee|onyx|snow|sand|sage|forge\s*slate|rose\s*clay|saltbush|willow|horizon|charcoal|cream|coral|lilac|magenta|teal|olive|maroon|burgundy|champagne|platinum|copper|titanium|graphite|space\s*gray|space\s*grey|midnight|starlight|product\s*red|pastel)\b/gi

/** Collapse colorways / strap variants of the same listing into one key. */
export function variantKey(name: string): string {
  let s = (name || '').toLowerCase().replace(/®/g, '')
  // drop strap / band color clauses
  s = s.replace(/\bwith\b[^,]{0,60}\b(straps?|bands?|rubber)\b/gi, ' ')
  // "One all black / One Black and White" combo packs
  s = s.replace(/\bone\s+all\b.*$/i, ' ')
  // gift / value deal trailing color packs after last " - "
  s = s.replace(/\s*[-–—]\s*(one\s+all|[\w\s/&+]{1,50})$/gi, (tail) => {
    const t = tail.replace(/[-–—]/g, ' ')
    if (/\b(pro\s*max|iphone|mm|oz|ml|inch|atm|screen|card|bluetooth|amoled|waterproof)\b/i.test(t)) {
      return tail
    }
    if (COLOR_RE.test(t) || /\bone\s+all\b/i.test(t) || /\//.test(t)) return ' '
    return tail
  })
  s = s.replace(COLOR_RE, ' ')
  s = s.replace(/\b\d+\s*(piece|pieces|pcs?)\b/gi, ' ')
  s = s.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  // Cap length so long marketing suffixes don't split the same SKU family
  const tokens = s.split(' ').filter(Boolean)
  return tokens.slice(0, 16).join(' ')
}

async function loadOrdered(ids: string[]): Promise<Set<string>> {
  const ordered = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const { data } = await supabase.from('order_items').select('productId').in('productId', chunk)
    for (const r of data || []) ordered.add(r.productId)
  }
  return ordered
}

async function removeProducts(ids: string[], ordered: Set<string>) {
  const toArchive = ids.filter((id) => ordered.has(id))
  const toDelete = ids.filter((id) => !ordered.has(id))
  if (dryRun) {
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
    if (!error) archived += chunk.length
  }
  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    await supabase.from('favorites').delete().in('productId', chunk)
    await supabase.from('product_images').delete().in('productId', chunk)
    const { error } = await supabase.from('products').delete().in('id', chunk)
    if (error) {
      await supabase
        .from('products')
        .update({ status: 'ARCHIVED', updatedAt: new Date().toISOString() })
        .in('id', chunk)
      archived += chunk.length
    } else {
      deleted += chunk.length
    }
  }
  return { deleted, archived }
}

async function dedupeSlug(slug: string) {
  const { data: cat, error } = await supabase.from('categories').select('id, name').eq('slug', slug).single()
  if (error || !cat) throw new Error(`Category missing: ${slug}`)

  const products: Product[] = []
  let from = 0
  while (true) {
    const { data, error: qErr } = await supabase
      .from('products')
      .select('id, name, sku, createdAt, categoryId')
      .eq('categoryId', cat.id)
      .eq('status', 'PUBLISHED')
      .range(from, from + 999)
    if (qErr) throw qErr
    if (!data?.length) break
    products.push(...(data as Product[]))
    if (data.length < 1000) break
    from += 1000
  }

  console.log(`\n=== ${slug} (${cat.name}) — ${products.length} published ===`)

  const groups = new Map<string, Product[]>()
  for (const p of products) {
    const key = variantKey(p.name)
    if (!key || key.length < 12) {
      // too short / risky — treat as unique by id
      groups.set(`id:${p.id}`, [p])
      continue
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const ordered = await loadOrdered(products.map((p) => p.id))
  const drop: string[] = []
  let groupCount = 0

  for (const [key, group] of groups) {
    if (group.length < 2) continue
    groupCount++
    const sorted = [...group].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const orderedIn = sorted.filter((p) => ordered.has(p.id))
    const keeper = orderedIn[0] || sorted[0]
    for (const p of group) {
      if (p.id !== keeper.id) drop.push(p.id)
    }
    if (groupCount <= 8) {
      console.log(`  keep 1 / drop ${group.length - 1}: ${key.slice(0, 70)}`)
      console.log(`    keep: ${keeper.name.slice(0, 90)}`)
    }
  }

  console.log(`Duplicate variant groups: ${groupCount}`)
  console.log(`Products to remove: ${drop.length}${dryRun ? ' [DRY RUN]' : ''}`)

  const { deleted, archived } = await removeProducts(drop, ordered)

  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')

  console.log(`Done ${slug}: deleted=${deleted} archived=${archived} published_now=${count}`)
  return { slug, deleted, archived, published: count }
}

async function main() {
  console.log(`Variant dedupe for: ${slugs.join(', ')}${dryRun ? ' [DRY RUN]' : ''}`)
  const results = []
  for (const slug of slugs) {
    results.push(await dedupeSlug(slug))
  }
  console.log('\n=== Summary ===')
  console.log(results)
}

const isDirect =
  typeof process.argv[1] === 'string' &&
  /dedupe-category-variants\.(ts|js|mts|cjs)$/.test(process.argv[1].replace(/\\/g, '/'))

if (isDirect) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
