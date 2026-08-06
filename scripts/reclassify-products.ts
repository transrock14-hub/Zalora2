/**
 * Audit every published product and move it to the correct category.
 *
 * Signals (priority order):
 *  1. High-precision name keywords (fragrance, makeup, sunglasses, smart watch…)
 *  2. Source breadcrumb from description ("Category: A > B > C")
 *  3. Namshi categories line ("Namshi categories: Bags, Women")
 *  4. SKU prefix intent (WS→women-shoes, MK→lifestyle, …)
 *
 * Motor vehicles (motorcycles/scooters) are junk from DummyJSON → ARCHIVED.
 *
 * Run:
 *   npx tsx scripts/reclassify-products.ts --dry-run
 *   npx tsx scripts/reclassify-products.ts
 */
import { readFileSync, writeFileSync } from 'fs'
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
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { global: { fetch: (i, init) => fetch(i, { ...init, cache: 'no-store' }) } }
)

type P = {
  id: string
  name: string
  sku: string | null
  categoryId: string
  description: string | null
  shortDesc: string | null
}

// ---------- helpers ----------

const VEHICLE_RE =
  /\b(motorcycle|sportbike|scooter motorcycle|kawasaki|ducati|yamaha r|honda cbr|iscooter)\b/i

/** Fragrances — name is decisive regardless of stored category. */
const FRAGRANCE_RE =
  /\b(edp|edt|eau de parfum|eau de toilette|eau de cologne|\bcologne\b|parfum|fragrance mist|body mist|perfume)\b/i

/** Beauty / personal care — decisive. */
const BEAUTY_RE =
  /\b(lipstick|lip gloss|lip balm|lip liner|mascara|eyeliner|eyeshadow|eye shadow|shadow palette|makeup palette|foundation|concealer|blush (palette|powder|stick|duo)|bronzer|highlighter|makeup|make-up|kajal|kohl|serum|moisturi[sz]er|moisturi[sz]ing|cleanser|cleansing|toner|sunscreen|spf \d|face mask|sheet mask|face wash|facial|shampoo|conditioner|hair oil|hair mask|body wash|body lotion|body scrub|shower gel|hand cream|night cream|day cream|anti[- ]?aging|wrinkle|retinol|niacinamide|hyaluronic|exfoliat|skincare|skin care|nail polish|nail lacquer|brow (gel|pencil)|beard oil|aftershave|after-shave|deodorant|scar gel|micellar|essence \d+ml|ampoule)\b/i

/** Electronics — decisive. */
const TECH_RE =
  /\b(smart\s*watch|smartwatch|earbuds?|earphones?|headphones?|headset|tws\b|bluetooth speaker|power\s*bank|powerbank|charger|usb\b|laptop sleeve|laptop caddy|laptop bag|tablet case|phone case|magsafe|airpods|fitness tracker|wireless (mouse|keyboard)|microphone|webcam|vacuum cleaner|air purifier|humidifier|ktv machine|dash ?cam|drone)\b/i

/** Fashion accessories — decisive. */
const ACCESSORY_RE =
  /\b(sunglasses|eyeglasses|optical frame|watch strap|watch band|bracelet|necklace|earrings?|pendant|anklet|brooch|cufflinks?|jewell?ery|belt\b|wallet|card holder|cardholder|key ?chain|keyring|scarf|beanie|fedora|bucket hat|baseball cap|snapback|hair ?(clip|band|tie)|scrunchie|hijab|brolly|umbrella)\b/i

/** Watches (non-smart) → accessories. */
const WATCH_RE = /\bwatch(es)?\b/i

/** Home & garden — decisive. */
const HOME_RE =
  /\b(microwave|oven\b|air fryer|blender|kettle|toaster|cookware|frying pan|sauce ?pan|grill pan|\bpot\b|mug\b|tumbler|drinkware|dinnerware|cutlery|plate set|bowl set|glassware|bedding|bed sheet|duvet|comforter|pillow|blanket|towel|bath mat|shower curtain|curtain|rug\b|carpet|sofa|couch|armchair|table lamp|floor lamp|lamp\b|vase|candle|diffuser|planter|garden|mattress|wardrobe|drawer|shelf|shelving|mirror\b|clock\b|photo frame|home decor|figurine|mug tree|storage box|storage bag|water bottle|vacuum insulated|aquaflask|flask\b|organizer|laundry|broom|mop\b)\b/i

const SHOE_RE =
  /\b(sneakers?|shoes?|sandals?|boots?|heels?|loafers?|flats\b|slippers?|flip[- ]?flops?|espadrilles?|mules\b|oxfords?|derby|brogues?|cleats|trainers|pumps\b|wedges\b|slides\b|moccasins?)\b/i

const BAG_RE =
  /\b(backpack|tote|handbag|crossbody|sling bag|messenger bag|duffel|duffle|clutch|satchel|shoulder bag|bum ?bag|waist bag|belt bag|luggage|carry-?on|suitcase|briefcase|chest bag|drawstring bag|gym bag|dry bag)\b/i

const CLOTHING_RE =
  /\b(t-?shirts?|shirts?|polo\b|blouse|dress(es)?\b|gown|skirts?|jeans|trousers?|pants\b|shorts\b|leggings?|hoodies?|sweatshirts?|sweaters?|jumpers?|cardigans?|jackets?|coats?|blazers?|parka|vest\b|tank top|camisole|jumpsuit|romper|overalls?|sweatpants|joggers?|tracksuit|underwear|brassiere|\bbra\b|panties|boxers?|briefs\b|socks\b|pyjamas?|pajamas?|nightwear|swimsuit|swimwear|bikini|one[- ]?piece|abaya|kaftan|tunic|bodysuit|frock|onesie|activewear|rash ?guard)\b/i

const MEN_RE = /\b(men'?s?|man\b|male\b|gents?|boys?)\b/i
const WOMEN_RE = /\b(women'?s?|woman\b|ladies|lady\b|female|girls?)\b/i

function genderOf(text: string): 'men' | 'women' | null {
  const m = MEN_RE.test(text)
  const w = WOMEN_RE.test(text)
  if (m && !w) return 'men'
  if (w && !m) return 'women'
  if (w && m) return /\bwomen|ladies\b/i.test(text) ? 'women' : 'men'
  return null
}

/** Map a "A > B > C" breadcrumb to a local slug. */
function fromBreadcrumb(crumb: string, name: string): string | null {
  const c = crumb.toLowerCase()
  const parts = c.split('>').map((s) => s.trim())
  const top = parts[0] || ''
  const joined = parts.join(' ')

  if (/technology|electronics|gadgets?|smart watch|earphones?|headphones?|audio\b|home appliance|vacuum|air purifier/.test(joined))
    return 'electronics'
  if (/beauty|skincare|skin care|make ?up|fragrance|bath & body|hair care|nail care|grooming|personal care|sun-?care/.test(joined))
    return 'lifestyle'
  if (/home & lifestyle|home decor|kitchen|bed & bath|home essentials/.test(joined)) return 'home-garden'
  if (top === 'kids' || /\bkids\b/.test(joined)) {
    if (/\bgirls?\b/.test(joined + ' ' + name.toLowerCase())) return 'girls'
    if (/\bboys?\b/.test(joined + ' ' + name.toLowerCase())) return 'boys'
    return null
  }
  if (/bags?|backpacks?|luggage/.test(joined)) {
    if (top === 'men' || /\bmen\b/.test(joined)) return 'men-bags'
    return 'women-bags'
  }
  if (/shoes?|sneakers?|sandals?|boots?|footwear|heels?/.test(joined)) {
    if (top === 'men' || (/\bmen\b/.test(joined) && !/women/.test(joined))) return 'men-shoes'
    return 'women-shoes'
  }
  if (/accessories|watches?|jewell?ery|sunglasses|belts?|hats?|caps?|scarves|wallets?/.test(joined))
    return 'accessories'
  if (top === 'men' || (/\bmen\b/.test(joined) && !/women/.test(joined))) return 'men-clothing'
  if (top === 'women' || top === 'luxury' || /women/.test(joined)) return 'women-clothing'
  if (top === 'sports') {
    if (/\bmen\b/.test(joined) && !/women/.test(joined)) return 'men-clothing'
    return 'women-clothing'
  }
  return null
}

/** Map "Namshi categories: Bags, Women" to slug. */
function fromNamshi(cats: string, name: string): string | null {
  const c = cats.toLowerCase()
  if (/kids/.test(c)) {
    if (/girls?/.test(c) || /girl/i.test(name)) return 'girls'
    if (/boys?/.test(c) || /boy/i.test(name)) return 'boys'
    return null
  }
  if (/fragrance|beauty|perfume/.test(c)) return 'lifestyle'
  if (/sunglasses|watches|jewell?ery|accessor/.test(c)) return 'accessories'
  const men = /\bmen\b/.test(c)
  const women = /\bwomen\b/.test(c)
  if (/bags?/.test(c)) return men && !women ? 'men-bags' : 'women-bags'
  if (/shoes?|sneakers|footwear/.test(c)) return men && !women ? 'men-shoes' : 'women-shoes'
  if (/clothing|dresses|tops|bottoms/.test(c)) return men && !women ? 'men-clothing' : 'women-clothing'
  return null
}

const SKU_PREFIX_SLUG: Record<string, string> = {
  WS: 'women-shoes',
  MS: 'men-shoes',
  MB: 'men-bags',
  WB: 'women-bags',
  WC: 'women-clothing',
  MC: 'men-clothing',
  HG: 'home-garden',
  GL: 'girls',
  BY: 'boys',
  ACC: 'accessories',
  MK: 'lifestyle',
  MK2: 'lifestyle',
  MK3: 'lifestyle',
  LS: 'lifestyle',
  ZLS: 'lifestyle',
  ZEL: 'electronics',
  ZMB: 'men-bags',
}

/**
 * Decide correct slug. Returns null when unsure (keep current).
 */
function classify(p: P, currentSlug: string): { slug: string | null; reason: string } {
  const name = p.name || ''
  const blob = `${name} ${p.shortDesc || ''}`

  // 0) junk vehicles
  if (VEHICLE_RE.test(name) && !/socks|jersey|jacket|glove|helmet visor|t-shirt/i.test(name)) {
    return { slug: 'ARCHIVE', reason: 'vehicle junk' }
  }

  // 1) decisive name signals
  if (FRAGRANCE_RE.test(name)) return { slug: 'lifestyle', reason: 'name:fragrance' }
  if (BEAUTY_RE.test(name) && !/case|bag|pouch|organizer/i.test(name) && !SHOE_RE.test(name))
    return { slug: 'lifestyle', reason: 'name:beauty' }
  // Graphic tees mentioning tech words are still clothing
  if (TECH_RE.test(name) && !CLOTHING_RE.test(name))
    return { slug: 'electronics', reason: 'name:tech' }
  if (/sunglasses|eyeglasses/i.test(name)) return { slug: 'accessories', reason: 'name:sunglasses' }
  // Drink/storage containers before bag/crumb rules
  if (/\b(water bottle|storage bag|vacuum insulated|aquaflask|tumbler|flask)\b/i.test(name)) {
    return { slug: 'home-garden', reason: 'name:container' }
  }

  // breadcrumb from imports
  const crumbMatch = (p.description || '').match(/Category:\s*([^\n]+)/)
  const crumb = crumbMatch?.[1]?.trim() || ''

  // watches: smart → electronics, other → accessories (skip when it's really a bag)
  if (WATCH_RE.test(name) && !/watch strap|watch band|bumper/i.test(name) && !BAG_RE.test(name)) {
    if (/smart|fitness|ios|android|bluetooth|gps|garmin|solar/i.test(name)) {
      return { slug: 'electronics', reason: 'name:smartwatch' }
    }
    if (!/electronics|technology/i.test(crumb)) {
      return { slug: 'accessories', reason: 'name:watch' }
    }
  }

  // 2) breadcrumb
  if (crumb) {
    const s = fromBreadcrumb(crumb, name)
    if (s) return { slug: s, reason: `crumb:${crumb.slice(0, 40)}` }
  }

  // 3) Namshi categories
  const nm = (p.description || '').match(/Namshi categories:\s*([^\n|]+)/)
  if (nm) {
    const s = fromNamshi(nm[1], name)
    if (s) return { slug: s, reason: `namshi:${nm[1].trim().slice(0, 30)}` }
  }

  // 4) generic name-type inference (only when current category is type-incompatible)
  const gender = genderOf(blob)
  if (HOME_RE.test(name) && !SHOE_RE.test(name) && !BAG_RE.test(name) && !CLOTHING_RE.test(name)) {
    return { slug: 'home-garden', reason: 'name:home' }
  }
  if (SHOE_RE.test(name) && !BAG_RE.test(name)) {
    if (currentSlug === 'girls' || currentSlug === 'boys') return { slug: null, reason: 'kids shoes ok' }
    const s = gender === 'men' ? 'men-shoes' : gender === 'women' ? 'women-shoes' : null
    if (s) return { slug: s, reason: 'name:shoes+gender' }
    if (currentSlug === 'men-shoes' || currentSlug === 'women-shoes') return { slug: null, reason: 'shoes ok' }
    return { slug: 'women-shoes', reason: 'name:shoes default' }
  }
  if (BAG_RE.test(name)) {
    if (currentSlug === 'girls' || currentSlug === 'boys') return { slug: null, reason: 'kids bag ok' }
    const s = gender === 'men' ? 'men-bags' : gender === 'women' ? 'women-bags' : null
    if (s) return { slug: s, reason: 'name:bag+gender' }
    if (currentSlug === 'men-bags' || currentSlug === 'women-bags') return { slug: null, reason: 'bag ok' }
    return { slug: 'women-bags', reason: 'name:bag default' }
  }
  if (CLOTHING_RE.test(name)) {
    if (currentSlug === 'girls' || currentSlug === 'boys') return { slug: null, reason: 'kids clothing ok' }
    const s = gender === 'men' ? 'men-clothing' : gender === 'women' ? 'women-clothing' : null
    if (s) return { slug: s, reason: 'name:clothing+gender' }
    if (currentSlug === 'men-clothing' || currentSlug === 'women-clothing')
      return { slug: null, reason: 'clothing ok' }
    return { slug: null, reason: 'clothing no gender' }
  }

  // 5) SKU prefix intent — only to catch items that drifted into a different category
  const prefix = (p.sku || '').split('-')[0]
  const pSlug = SKU_PREFIX_SLUG[prefix]
  if (pSlug) return { slug: pSlug, reason: `sku:${prefix}` }

  return { slug: null, reason: 'no signal' }
}

// ---------- main ----------

async function main() {
  const { data: cats } = await supabase.from('categories').select('id, slug')
  if (!cats?.length) throw new Error('no categories')
  const slugById = new Map(cats.map((c) => [c.id, c.slug]))
  const idBySlug = new Map(cats.map((c) => [c.slug, c.id]))

  const products: P[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, categoryId, description, shortDesc')
      .eq('status', 'PUBLISHED')
      .range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    products.push(...(data as P[]))
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`Published products: ${products.length}${dryRun ? ' [DRY RUN]' : ''}`)

  const moves: Array<{ id: string; name: string; from: string; to: string; reason: string }> = []
  const archives: Array<{ id: string; name: string; from: string }> = []

  for (const p of products) {
    const currentSlug = slugById.get(p.categoryId) || '?'
    const { slug, reason } = classify(p, currentSlug)
    if (!slug) continue
    if (slug === 'ARCHIVE') {
      archives.push({ id: p.id, name: p.name, from: currentSlug })
      continue
    }
    if (slug !== currentSlug && idBySlug.has(slug)) {
      moves.push({ id: p.id, name: p.name, from: currentSlug, to: slug, reason })
    }
  }

  // report
  const pairCounts = new Map<string, number>()
  for (const m of moves) {
    const k = `${m.from} → ${m.to}`
    pairCounts.set(k, (pairCounts.get(k) || 0) + 1)
  }
  console.log(`\nMoves: ${moves.length}, Archives (vehicles): ${archives.length}`)
  for (const [k, n] of [...pairCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${k}`)
  }
  console.log('\nSample moves:')
  const seenPair = new Set<string>()
  for (const m of moves) {
    const k = `${m.from}→${m.to}`
    if (seenPair.has(k)) continue
    seenPair.add(k)
    console.log(`  [${k}] ${m.name.slice(0, 70)}  (${m.reason})`)
  }
  for (const a of archives) console.log(`  [ARCHIVE from ${a.from}] ${a.name.slice(0, 60)}`)

  writeFileSync(
    join(process.cwd(), 'catalog', 'reclassify-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), moves, archives }, null, 2)
  )
  console.log('\nWrote catalog/reclassify-report.json')

  if (dryRun) return

  // apply
  const now = new Date().toISOString()
  let moved = 0
  for (const m of moves) {
    const { error } = await supabase
      .from('products')
      .update({ categoryId: idBySlug.get(m.to)!, updatedAt: now })
      .eq('id', m.id)
    if (error) console.warn(`move fail ${m.name.slice(0, 40)}: ${error.message}`)
    else moved++
  }
  let archived = 0
  for (const a of archives) {
    const { error } = await supabase
      .from('products')
      .update({ status: 'ARCHIVED', updatedAt: now })
      .eq('id', a.id)
    if (!error) archived++
  }
  console.log(`\nApplied: moved=${moved}, archived=${archived}`)

  // final counts
  console.log('\nFinal category counts:')
  for (const c of cats.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('categoryId', c.id)
      .eq('status', 'PUBLISHED')
    console.log(`  ${String(count).padStart(5)}  ${c.slug}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
