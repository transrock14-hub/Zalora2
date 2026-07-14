/**
 * Re-assign Lifestyle product images so each photo matches the product type
 * (candles ≠ sneakers). Uses theme-keyed Unsplash pools + DummyJSON home/
 * lifestyle photos as extras. Unique URL per product. No AI images.
 *
 * Run: npx tsx scripts/reimage-lifestyle-matched.ts
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

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(URL, KEY)

const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`

/** Theme → photos that actually look like that theme */
const THEME_POOLS: Record<string, string[]> = {
  candle: [
    u('1603006905000-4a8e8f5f9d3b'), // may fail
    u('1603006903443-1306bad836d0'),
    u('1602928321676-354314287990'),
    u('1572725182171-c412d4310739'),
    u('1608571423902-eed4a5adbb6a'),
    'https://cdn.dummyjson.com/product-images/home-decoration/decoration-hanging-light/1.webp',
  ],
  diffuser: [
    u('1603006905491-01d92bf74a7a'),
    u('1556228453-efd6c1ff04f6'),
    u('1600210492493-0946911123ea'),
    'https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/1.webp',
  ],
  yoga: [
    u('1544367567-0f2fcb009e0b'),
    u('1518611012118-696072aa579a'),
    u('1599901860904-17e6bd3cabab'),
    u('1506126613408-eca07ce68786'),
    u('1552196563-89d4ae54a46a'),
  ],
  fitness: [
    u('1571019613454-1cb2f99b2d8b'),
    u('1571902943202-507ec2618e8f'),
    u('1518310382802-5b7a1ae49753'),
    u('1434682881905-6f0317f89f4b'),
  ],
  coffee: [
    u('1495474472287-4d71bcdd2085'),
    u('1498804103079-a9356bfec589'),
    u('1511920170033-f8396924c348'),
    u('1461027029759-c8c3d3b8c1ad'),
    u('1509042239860-f550ce710b93'),
    u('1514432324607-a09d6be75d33'),
  ],
  tea: [
    u('1559056199-641a0ac8b55e'),
    u('1576092768241-a3f2b5472d5f'),
    u('1564890366654-0a0780f3c82f'),
  ],
  drinkware: [
    u('1602143407151-7111542de6e8'),
    u('1602143412157-3361287bcff2'),
    u('1572116867536-b984d043be09'),
  ],
  kitchen: [
    u('1556912172-45b7abe910ea'),
    u('1556911220-bff4c0b8c839'),
    u('1556910103-1c02745aae4d'),
    u('1506368249639-4b8c9f0a28b5'),
    'https://cdn.dummyjson.com/product-images/kitchen-accessories/bamboo-spatula/1.webp',
  ],
  desk: [
    u('1486312338219-ce68d2c6f44d'),
    u('1499951360440-aec7d4b51753'),
    u('1519389950475-c5a8c4f0b4a0'),
    u('1593642632823-8f785ba67e45'),
  ],
  stationery: [
    u('1456327102063-5ab79ac4d566'),
    u('1517842645767-c6390e465727'),
    u('1484480974693-6ca0a71bd74b'),
    u('1456513080840-b08fc60dacff'),
    u('1544716278-ca5e3f4abd8c'),
  ],
  lighting: [
    u('1513506003901-1e6a229e2e15'),
    u('1507473885765-e6ed057f782c'),
    u('1532372320572-cda25653a26d'),
    u('1540932239986-30128078ea0d'),
    'https://cdn.dummyjson.com/product-images/lighting/damp-proof-ceiling-light/1.webp',
  ],
  plants: [
    u('1485955903038-8976b5f2f54d'),
    u('1416879595882-3373a0480b5b'),
    u('1459411552998-668b09ef856c'),
    u('1466692478816-51567867df3a'),
    u('1491147334573-44cbb4602074'),
    u('1501004318641-b39e6451bec6'),
  ],
  decor: [
    u('1586023492125-27b2c045efd7'),
    u('1567016432779-094069958ea5'),
    u('1513694203232-719a280e022f'),
    u('1524758631624-e2822e304c36'),
    u('1616486338812-3dadae4b4ace'),
    u('1481277542470-605612bd2d61'),
  ],
  home: [
    u('1522708323590-d24dbb6b0267'),
    u('1493663284031-bd9b440560a8'),
    u('1505693416388-ac5ce068fe85'),
    u('1540518614846-c64202678754'),
    u('1616046229478-6991f90a0a36'),
  ],
  'home-textile': [
    u('1583847268964-b28dc65e8050'),
    u('1615873968403-89e068629265'),
    u('1600210492486-724fe5c67fb3'),
    u('1631679706909-1844cd29d688'),
  ],
  bath: [
    u('1556228720-195a672e8a03'),
    u('1507652313519-d4e9174996dd'),
    u('1584622785216-75e84ff265f9'),
    u('1620625572941-3e0c28ae9764'),
  ],
  sleep: [
    u('1522771739844-6a9dcdcfae35'),
    u('1631049307250-a1bbae707d7c'),
    u('1505693416388-ac5ce068fe85'),
  ],
  wellness: [
    u('1515377905703-c4788e51af15'),
    u('1570172619644-dfd5a8242491'),
    u('1544367563-78bcd796600f'),
    u('1608571423902-eed4a5adbb6a'),
  ],
  personal: [
    u('1522335789203-aabd916268a1'),
    u('1596462502278-27bfdc403348'),
    u('1515377905703-c4788e51af15'),
  ],
  outdoor: [
    u('1500530855697-b586d89ba3ee'),
    u('1476514525535-07fb3b4ae5f1'),
    u('1504280390367-361c6d9f38f4'),
    u('1506905925346-21bda4d32df4'),
  ],
  travel: [
    u('1488646953014-85cb44e25828'),
    u('1469854523086-cc02fe5d8800'),
    u('1523906834658-6e24ef2386f9'),
  ],
  bags: [
    u('1548036328-c9fa89d128fa'),
    u('1553062407-98eeb64c6a62'),
    u('1590874103328-eac38a683ce7'),
    u('1566150905458-1bf1fc113f0d'),
  ],
  everyday: [
    u('1553062407-98eeb64c6a62'),
    u('1526170375885-4d8ecf77b99f'),
    u('1513885535751-8b9238bd345a'),
  ],
  audio: [
    u('1546435770-a3e426bf472b'),
    u('1505740420928-5e560c06d30e'),
    u('1484704849700-f032a568e944'),
  ],
  'smart-home': [
    u('1558002038-671c0a9f1caa'),
    u('1558618666-fcd25c85cd64'),
    u('1558002038-1055907df087'),
  ],
  reading: [
    u('1512820791003-dd46bfdc6304'),
    u('1495446811533-0a4a1be53011'),
    u('1456513080840-b08fc60dacff'),
  ],
  table: [
    u('1414235077428-338989a2e8c0'),
    u('1556910103-1c02745aae4d'),
    u('1513519245088-0e12902e35a6'),
  ],
}

const FILL = [
  u('1586023492125-27b2c045efd7'),
  u('1567016432779-094069958ea5'),
  u('1513694203232-719a280e022f'),
  u('1524758631624-e2822e304c36'),
  u('1616486338812-3dadae4b4ace'),
  u('1556228453-efd6c1ff04f6'),
  u('1481277542470-605612bd2d61'),
  u('1522708323590-d24dbb6b0267'),
  u('1493663284031-bd9b440560a8'),
  u('1505693416388-ac5ce068fe85'),
  u('1485955903038-8976b5f2f54d'),
  u('1416879595882-3373a0480b5b'),
  u('1495474472287-4d71bcdd2085'),
  u('1511920170033-f8396924c348'),
  u('1544367567-0f2fcb009e0b'),
  u('1518611012118-696072aa579a'),
  u('1556912172-45b7abe910ea'),
  u('1584622785216-75e84ff265f9'),
  u('1484480974693-6ca0a71bd74b'),
  u('1513506003901-1e6a229e2e15'),
  // DummyJSON lifestyle-ish product images (unique paths)
  ...Array.from({ length: 30 }, (_, i) => `https://cdn.dummyjson.com/product-images/home-decoration/plant-pots-${(i % 3) + 1}/thumbnail.webp`).filter((_, i) => i < 3),
  'https://cdn.dummyjson.com/product-images/home-decoration/plant-pots/1.webp',
  'https://cdn.dummyjson.com/product-images/home-decoration/plant-pots/2.webp',
  'https://cdn.dummyjson.com/product-images/home-decoration/plant-pots/3.webp',
  'https://cdn.dummyjson.com/product-images/furniture/bedside-table-african-cherry/1.webp',
  'https://cdn.dummyjson.com/product-images/furniture/sofa-bed/1.webp',
  'https://cdn.dummyjson.com/product-images/furniture/wooden-office-chair/1.webp',
  'https://cdn.dummyjson.com/product-images/kitchen-accessories/electric-stove/1.webp',
  'https://cdn.dummyjson.com/product-images/kitchen-accessories/microwave-oven/1.webp',
  'https://cdn.dummyjson.com/product-images/kitchen-accessories/tabletop-bowl-with-bamboo-base/1.webp',
  'https://cdn.dummyjson.com/product-images/kitchen-accessories/stainless-steel-water-bottle/1.webp',
  'https://cdn.dummyjson.com/product-images/kitchen-accessories/stainless-steel-water-bottle/2.webp',
  'https://cdn.dummyjson.com/product-images/kitchen-accessories/black-whisk/1.webp',
  'https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/1.webp',
  'https://cdn.dummyjson.com/product-images/lighting/damp-proof-ceiling-light/1.webp',
  'https://cdn.dummyjson.com/product-images/lighting/damp-proof-ceiling-light/2.webp',
  'https://cdn.dummyjson.com/product-images/mobile-accessories/self-lamp/1.webp',
  'https://cdn.dummyjson.com/product-images/sports-accessories/basketball/1.webp',
  'https://cdn.dummyjson.com/product-images/sports-accessories/tennis-basketballs/1.webp',
  'https://cdn.dummyjson.com/product-images/sports-accessories/cricket-helmet/1.webp',
  'https://cdn.dummyjson.com/product-images/sunglasses/classic-silver-frame/1.webp',
  // Picsum (real Unsplash photography via picsum IDs) — lifestyle-safe fill, unique
  ...Array.from({ length: 80 }, (_, i) => `https://picsum.photos/id/${20 + i}/800/800`),
]

function themeFor(name: string): string {
  const n = name.toLowerCase()
  if (/candle|incense|match/.test(n)) return 'candle'
  if (/diffuser|aroma|oil roller|essential oil/.test(n)) return 'diffuser'
  if (/yoga|meditation|zafu|mandala strap/.test(n)) return 'yoga'
  if (/resistance|foam roller|dumbbell|stretch|balance board|flexband/.test(n)) return 'fitness'
  if (/coffee|pour-over|french press|frother|cold brew|kettle|mug/.test(n)) return 'coffee'
  if (/tea|matcha/.test(n)) return 'tea'
  if (/bottle|travel mug|drinkware|flask/.test(n)) return 'drinkware'
  if (/kitchen|board|apron|herb scissors|bread|meal planner|recipe|spatula|cutlery/.test(n)) return 'kitchen'
  if (/desk|organiser|cable|phone stand|charger|power strip|hygrometer|timer/.test(n)) return 'desk'
  if (/journal|bookmark|habit|stationery|notebook|pen/.test(n)) return 'stationery'
  if (/lamp|led|fairy light|salt crystal|lighting|book light/.test(n)) return 'lighting'
  if (/plant|planter|seed|mister|macramé|macrame|herb planter/.test(n)) return 'plants'
  if (/vase|wall art|catch-all|photo frame|decor|incense holder/.test(n)) return 'decor'
  if (/throw|cushion|blanket|pillow|linen napkin|flannel|sheet|table runner/.test(n)) return 'home-textile'
  if (/towel|bath|soak|dry brush|guest towel/.test(n)) return 'bath'
  if (/sleep|eye mask|white noise|ear plug|pillowcase|alarm/.test(n)) return 'sleep'
  if (/wellness|scrub|facial|acupressure|hot water|breathing|bath soak/.test(n)) return 'wellness'
  if (/mirror|scrunchie|cloth pack|tongue|grooming/.test(n)) return 'personal'
  if (/picnic|camp|cooler|outdoor|seat pad|bike|produce/.test(n)) return 'outdoor'
  if (/travel|packing|passport|neck pillow/.test(n)) return 'travel'
  if (/backpack|tote|sling|bag|carrier/.test(n)) return 'bags'
  if (/speaker|bluetooth|audio/.test(n)) return 'audio'
  if (/smart plug|wifi/.test(n)) return 'smart-home'
  if (/book light|reading/.test(n)) return 'reading'
  if (/coaster|napkin|serving|table/.test(n)) return 'table'
  if (/laundry|hamper|home/.test(n)) return 'home'
  return 'home'
}

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

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'lifestyle').single()
  if (!cat) throw new Error('Lifestyle missing')

  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
    .order('createdAt', { ascending: true })

  if (!products?.length) throw new Error('No lifestyle products')

  // Pre-validate theme pools + fill
  const cache = new Map<string, boolean>()
  async function ok(url: string) {
    if (cache.has(url)) return cache.get(url)!
    const v = await urlOk(url)
    cache.set(url, v)
    return v
  }

  console.log('Pre-validating fill pool...')
  const fillOk: string[] = []
  for (let i = 0; i < FILL.length && fillOk.length < 120; i++) {
    if (await ok(FILL[i])) fillOk.push(FILL[i])
    if ((i + 1) % 20 === 0) console.log(`  fill ${fillOk.length} ok / ${i + 1} checked`)
  }
  console.log(`Fill OK: ${fillOk.length}`)

  const used = new Set<string>()
  let updated = 0

  for (const p of products) {
    const theme = themeFor(p.name)
    const pool = [...(THEME_POOLS[theme] || []), ...fillOk]
    let chosen: string | null = null
    for (const candidate of pool) {
      if (used.has(candidate)) continue
      if (await ok(candidate)) {
        chosen = candidate
        break
      }
    }
    if (!chosen) {
      // last resort unique picsum
      for (let id = 400; id < 600; id++) {
        const c = `https://picsum.photos/id/${id}/800/800`
        if (used.has(c)) continue
        if (await ok(c)) {
          chosen = c
          break
        }
      }
    }
    if (!chosen) throw new Error(`No image for ${p.name}`)
    used.add(chosen)

    await supabase.from('product_images').delete().eq('productId', p.id)
    const { error } = await supabase.from('product_images').insert({
      productId: p.id,
      url: chosen,
      alt: p.name,
      sortOrder: 0,
      isPrimary: true,
    })
    if (error) throw error
    updated++
    console.log(`[${updated}/${products.length}] ${theme.padEnd(12)} ${p.name.slice(0, 40)}`)
  }

  console.log(`\nDone. ${updated} products re-imaged. Unique URLs: ${used.size}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
