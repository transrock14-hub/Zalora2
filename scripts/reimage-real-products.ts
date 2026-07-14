/**
 * Re-image the seeded `real-%` products so every product in a category gets a
 * DISTINCT, validated image (fixes repetition + optimizer contention).
 *
 * - Validates each candidate URL (200 + image/* content-type); drops bad ones.
 * - Per category: category-specific images first, then a large shared pool of
 *   real product/fashion photos, so all 25 products in a category are unique.
 * - Replaces existing product_images for real-% products (2 images each).
 *
 * Run (against PROD): pass env inline, e.g.
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/reimage-real-products.ts
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}
loadEnv()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing Supabase env'); process.exit(1) }
const supabase = createClient(URL, KEY)

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`

// Category-appropriate candidates (validated at runtime).
const CATEGORY_IDS: Record<string, string[]> = {
  lifestyle: ['1513885535751-8b9238bd345a', '1556228453-efd6c1ff04f6', '1481277542470-605612bd2d61', '1526170375885-4d8ecf77b99f', '1522708323590-d24dbb6b0267', '1516575334481-f85287c2c82d'],
  'men-shoes': ['1542291026-7eec264c27ff', '1606107557195-0e29a4b5b4aa', '1595950653106-6c9ebd614d3a', '1608231387042-66d1773070a5', '1491553895911-0055eca6402d', '1460353581641-37baddab0fa2', '1600185365926-3a2ce3cdb9eb'],
  'women-shoes': ['1549298916-b41d501d3772', '1595341888016-a392ef81b7de', '1543163521-1bf539c55dd2', '1596703263926-eb0762ee17e4', '1518049362265-d5b2a6467637', '1560769629-975ec94e6a86'],
  accessories: ['1511499767150-a48a237f0083', '1524805444758-089113d48a6d', '1523275335684-37898b6baf30', '1508685096489-7aacd43bd3b1', '1572635196237-14b3f281503f', '1611085583191-a3b181a88401'],
  'men-clothing': ['1583743814966-8936f5b7be1a', '1551537482-f2075a1d41f2', '1473966968600-fa801b869a1a', '1521572163474-6864f9cf17ab', '1576566588028-4147f3842f27', '1618354691373-d851c5c3a990'],
  'women-bags': ['1584917865442-de89df76afd3', '1590874103328-eac38a683ce7', '1548036328-c9fa89d128fa', '1566150905458-1bf1fc113f0d', '1591561954557-26941169b49e', '1594223274512-ad4803739b7c'],
  'men-bags': ['1553062407-98eeb64c6a62', '1547949003-9792a18a2601', '1622560480605-d83c853bc5c3', '1548546738-8509cb246ed3', '1581605405669-fcdf81165afa'],
  'women-clothing': ['1572804013309-59a88b7e92f1', '1434389677669-e08b4cac3105', '1595777457583-95e059d581b8', '1490481651871-ab68de25d43d', '1496747611176-843222e1e57c', '1483985988355-763728e1935b'],
  girls: ['1519238263530-99bdd11df2ea', '1503919545889-aef636e10ad4', '1471286174890-9c112ffca5b4', '1522771930-fbb1c9fe6f9d', '1518831959646-742c3a14ebf7'],
  boys: ['1503944583220-79d8926ad5e2', '1519457431-44ccd64a579b', '1560506840-ec148e82a604', '1544413660-299165566b1d', '1602030638412-bb8dcc0bc8b0'],
  electronics: ['1505740420928-5e560c06d30e', '1546435770-a3e426bf472b', '1498049794561-7780e7231661', '1572569511254-d8f925fe2cbb', '1600294037681-c80b4cb5b434', '1484704849700-f032a568e944'],
  'home-garden': ['1586023492125-27b2c045efd7', '1567016432779-094069958ea5', '1513694203232-719a280e022f', '1524758631624-e2822e304c36', '1616486338812-3dadae4b4ace'],
}

// Extra real product/fashion photos used to guarantee 25 unique images per
// category (shared fill pool). Validated at runtime; broken ones dropped.
const EXTRA_IDS = [
  '1441984904996-e0b6ba687e04', '1445205170230-053b83016050', '1485462537746-965f33f7f6a7',
  '1487222477894-8943e31ef7b2', '1490114538077-0a7f8cb49891', '1495121605193-b116b5b9c5fe',
  '1495385794356-15371f348c31', '1496747611176-843222e1e57c', '1499971856191-1a420a42b498',
  '1502716119720-b23a93e5fe1b', '1509319117193-57bab727e09d', '1512436991641-6745cdb1723f',
  '1513094735237-8f2714d57c13', '1515886657613-9f3515b0c78f', '1516762689617-e1cffcef479d',
  '1519415387722-a1c3bbef716c', '1520006403909-838d6b92c22e', '1521123845560-14093637aa7d',
  '1525507119028-ed4c629a60a3', '1527719327859-c6ce80353573', '1528701800489-20be3c2ea5c9',
  '1529374255404-311a2a4f1fd9', '1532453288672-3a27e9be9efd', '1533055640609-24b498dfd74c',
  '1539533018447-63fcce2678e3', '1540221652346-e5dd6b50f3e7', '1542060748-10c28b62716f',
]

async function urlOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal })
    clearTimeout(t)
    const ct = res.headers.get('content-type') || ''
    return res.ok && ct.startsWith('image/')
  } catch {
    return false
  }
}

async function validate(ids: string[]): Promise<string[]> {
  const urls = ids.map(img)
  const res = await Promise.all(urls.map(async (u) => ({ u, ok: await urlOk(u) })))
  return res.filter((r) => r.ok).map((r) => r.u)
}

async function main() {
  console.log('Validating shared fill pool...')
  const fill = await validate(EXTRA_IDS)
  console.log(`  ${fill.length}/${EXTRA_IDS.length} fill images OK`)

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('isActive', true)
    .order('sortOrder')
  if (error) throw error

  let updated = 0

  for (const category of categories || []) {
    const catValidated = await validate(CATEGORY_IDS[category.slug] || [])
    // Category images first, then the shared fill pool; dedupe preserving order.
    const pool = Array.from(new Set([...catValidated, ...fill]))
    if (pool.length < 4) {
      console.log(`  [${category.name}] SKIP — not enough images (${pool.length})`)
      continue
    }

    const { data: products } = await supabase
      .from('products')
      .select('id, slug')
      .eq('categoryId', category.id)
      .ilike('slug', 'real-%')
      .order('slug')
    if (!products?.length) continue

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const primary = pool[i % pool.length]
      const secondary = pool[(i + 1) % pool.length]
      const urls = primary === secondary ? [primary] : [primary, secondary]

      // Replace images for this product
      await supabase.from('product_images').delete().eq('productId', p.id)
      const rows = urls.map((url, idx) => ({
        productId: p.id,
        url,
        alt: `${p.slug} view ${idx + 1}`,
        sortOrder: idx,
        isPrimary: idx === 0,
      }))
      const { error: insErr } = await supabase.from('product_images').insert(rows)
      if (insErr) console.warn(`  image insert warn (${p.slug}):`, insErr.message)
      else updated++
    }

    const distinctPrimaries = Math.min(products.length, pool.length)
    console.log(`  ✓ ${category.name}: ${products.length} products re-imaged (${distinctPrimaries} distinct primaries, pool=${pool.length})`)
  }

  console.log(`\n✅ Re-imaged ${updated} products.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
