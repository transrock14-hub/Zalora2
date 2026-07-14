/**
 * Home & Garden: ≥100 unique products, matched theme photos, prices > $300.
 * Keeps order-linked products. No "Photo N" duplicates.
 *
 * Run: npx tsx scripts/rebuild-home-garden-unique.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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

const TARGET = 100
const LIFE_ID = 'a6bbf30c-2517-4175-b215-575e96afeacd'
const ACC_ID = '0d4408b4-d053-4a5d-a7b0-82a55966bf52'
const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)

type Item = {
  name: string
  short: string
  description: string
  tags: string
  images?: string[]
}

const CATALOG: Item[] = [
  { name: 'Polaris Home Linen Throw Blanket Oat', short: 'Linen throw blanket', description: 'Soft oat linen-blend throw for sofas and beds.', tags: 'blanket,throw' },
  { name: 'Harbor Cotton Duvet Cover Set Soft Grey', short: 'Duvet cover set', description: 'Breathable cotton duvet cover with pillowcases.', tags: 'bedding,duvet' },
  { name: 'Nightingale Memory Foam Pillow Pair', short: 'Memory foam pillows', description: 'Supportive pair of shredded foam pillows.', tags: 'pillow,bedding' },
  { name: 'Aurelia Velvet Cushion Cover Ember', short: 'Velvet cushion cover', description: 'Rich velvet cover with hidden zip.', tags: 'cushion,pillow' },
  { name: 'Verdant Woven Area Rug 160x230', short: 'Woven living-room rug', description: 'Neutral woven rug for living spaces.', tags: 'rug,carpet' },
  { name: 'Oak & Ember Acacia Side Table', short: 'Acacia side table', description: 'Solid-look acacia side table with lower shelf.', tags: 'sidetable,furniture' },
  { name: 'Lumenora Ceramic Table Lamp Matte', short: 'Matte ceramic lamp', description: 'Matte ceramic base with linen shade.', tags: 'lamp,lighting' },
  { name: 'Brightfolio LED Floor Lamp Arc', short: 'Arc floor lamp', description: 'Overarching LED floor lamp for reading corners.', tags: 'floorlamp,lighting' },
  { name: 'Solstice Glass Bud Vase Trio', short: 'Bud vase set', description: 'Three clear bud vases for stems.', tags: 'vase,decor' },
  { name: 'Driftwood Framed Wall Print Coastal', short: 'Coastal wall print', description: 'Framed coastal photography print.', tags: 'wallart,frame' },
  { name: 'Keystone Modular Storage Cube Pair', short: 'Storage cubes', description: 'Two open cubes for shelves or benches.', tags: 'storage,cube' },
  { name: 'Coppernest Bamboo Laundry Hamper', short: 'Bamboo hamper', description: 'Ventilated bamboo laundry hamper with lid.', tags: 'laundry,basket' },
  { name: 'Fieldcraft Woven Storage Basket Large', short: 'Large storage basket', description: 'Woven basket for blankets and toys.', tags: 'basket,storage' },
  { name: 'Summit Forge Cast Iron Skillet 28cm', short: 'Cast iron skillet', description: 'Pre-seasoned skillet for stove and oven.', tags: 'skillet,cookware' },
  { name: 'Cascade Brew Pour-Over Stand Set', short: 'Pour-over coffee set', description: 'Dripper stand with glass carafe.', tags: 'coffee,kitchen' },
  { name: 'Harbor Stoneware Dinner Plate Set of 4', short: 'Stoneware dinner plates', description: 'Four matte stoneware dinner plates.', tags: 'plates,dinnerware' },
  { name: 'Silkroad Linen Napkin Set of 6', short: 'Linen napkins', description: 'Stonewashed linen napkins for dining.', tags: 'napkin,table' },
  { name: 'Nordvik Stainless Cutlery Set 24pc', short: '24-piece cutlery set', description: 'Brushed stainless flatware for six.', tags: 'cutlery,silverware' },
  { name: 'Helix Care Bamboo Cutting Board', short: 'Bamboo cutting board', description: 'Thick bamboo board with juice groove.', tags: 'cuttingboard,kitchen' },
  { name: 'Canopy Labs Herb Planter Windowsill', short: 'Herb planter', description: 'Self-watering windowsill herb planter.', tags: 'planter,herbs' },
  { name: 'Verdant Ceramic Plant Pot with Saucer', short: 'Ceramic plant pot', description: 'Glazed pot with drainage saucer.', tags: 'plantpot,ceramic' },
  { name: 'Atlas Peak Hanging Macrame Planter', short: 'Macrame planter', description: 'Cotton macrame hanger for trailing plants.', tags: 'macrame,planter' },
  { name: 'Garden Lane Pruning Shears Pro', short: 'Pruning shears', description: 'Bypass shears for shrubs and roses.', tags: 'pruners,garden' },
  { name: 'TerraForm Tools Hand Trowel Set', short: 'Garden trowel set', description: 'Trowel, cultivator and transplant spade.', tags: 'gardentools,trowel' },
  { name: 'RoverPet Outdoor Watering Can 5L', short: 'Watering can 5L', description: 'Lightweight can with rain-style rose.', tags: 'wateringcan,garden' },
  { name: 'Kelp & Clay Seed Starter Tray Kit', short: 'Seed starter kit', description: 'Tray, lids and soil pods for seedlings.', tags: 'seeds,gardening' },
  { name: 'Polaris Outdoor Floor Cushion Pair', short: 'Outdoor cushions', description: 'Water-resistant cushions for patio seats.', tags: 'outdoorcushion,patio' },
  { name: 'Summit Forge Folding Patio Chair', short: 'Folding patio chair', description: 'Portable folding chair for balconies.', tags: 'patiochair,outdoor' },
  { name: 'Harbor String Light Set Warm 10m', short: 'Warm string lights', description: 'Weatherproof warm LED string lights.', tags: 'stringlights,outdoor' },
  { name: 'Lumenora Salt Crystal Ambient Lamp', short: 'Salt lamp', description: 'Warm glow Himalayan-style salt lamp.', tags: 'saltlamp,lighting' },
  { name: 'Nightingale Blackout Curtain Pair', short: 'Blackout curtains', description: 'Room-darkening curtain panel pair.', tags: 'curtains,blackout' },
  { name: 'Aurelia Sheer Voile Curtain Pair', short: 'Sheer curtains', description: 'Light-filtering sheer panels.', tags: 'curtains,sheer' },
  { name: 'Oak & Ember Entryway Console Slim', short: 'Slim console table', description: 'Narrow console for hallways.', tags: 'consoletable,furniture' },
  { name: 'Bluefinch Floating Shelf Set of 3', short: 'Floating shelves', description: 'Three wall shelves with hidden brackets.', tags: 'shelf,wall' },
  { name: 'Keystone Wall Clock Silent Sweep', short: 'Silent wall clock', description: 'No-tick wall clock for bedrooms.', tags: 'wallclock,home' },
  { name: 'Paper & Pine Desk Organiser Oak', short: 'Desk organiser', description: 'Oak-look organiser for pens and notes.', tags: 'organiser,desk' },
  { name: 'Voltura Fabric Power Strip Cover', short: 'Fabric power strip', description: 'Cloth-covered strip that blends into rooms.', tags: 'powerstrip,home' },
  { name: 'NovaByte Smart Plug Twin Pack', short: 'Smart plug pair', description: 'Wi-Fi plugs for lamps and fans.', tags: 'smartplug,home' },
  { name: 'Brightfolio Gallery LED Strip 2m', short: 'Warm LED strip', description: 'USB LED strip for shelves and nooks.', tags: 'ledstrip,lighting' },
  { name: 'Helix Care Turkish Bath Towel Set', short: 'Turkish towel set', description: 'Absorbent towel set for spa-like baths.', tags: 'towel,bath' },
  { name: 'Solstice Bamboo Bath Mat', short: 'Bamboo bath mat', description: 'Slatted bamboo mat with non-slip pads.', tags: 'bathmat,bamboo' },
  { name: 'Coppernest Shower Caddy Over Door', short: 'Shower caddy', description: 'Rust-resistant over-door shower caddy.', tags: 'showercaddy,bath' },
  { name: 'Harbor Reed Diffuser Linen', short: 'Linen reed diffuser', description: 'Long-lasting linen scent diffuser.', tags: 'diffuser,home' },
  { name: 'Stillpoint Soy Candle Cedar Trio', short: 'Soy candle set', description: 'Three soy candles in cedar and citrus.', tags: 'candle,soy' },
  { name: 'Cinder Lane Match Striker Jar', short: 'Match striker jar', description: 'Ceramic jar with striker collar for candles.', tags: 'matches,candle' },
  { name: 'Driftwood Incense Holder Stone', short: 'Stone incense holder', description: 'Minimal stone dish for incense sticks.', tags: 'incense,decor' },
  { name: 'UrbanMesh Door Mat Indoor Outdoor', short: 'Door mat', description: 'Scrape-clean mat for entries.', tags: 'doormat,home' },
  { name: 'Fieldcraft Coat Hook Rail Oak', short: 'Coat hook rail', description: 'Wall rail with five sturdy hooks.', tags: 'hooks,entryway' },
  { name: 'Silkroad Mirror Round 50cm', short: 'Round wall mirror', description: '50cm round mirror with thin metal frame.', tags: 'mirror,wall' },
  { name: 'Lumenora Picture Frame Set Black', short: 'Picture frame set', description: 'Three mixed-size black frames.', tags: 'pictureframe,decor' },
  { name: 'Verdant Artificial Olive Tree 120cm', short: 'Faux olive tree', description: 'Lifelike olive tree for bright corners.', tags: 'faketree,decor' },
  { name: 'Atlas Peak Garden Kneeler Pad', short: 'Garden kneeler', description: 'Thick foam kneeler for beds and pots.', tags: 'gardening,kneeler' },
  { name: 'Garden Lane Hose Nozzle 8 Pattern', short: 'Hose nozzle', description: 'Eight-pattern adjustable hose nozzle.', tags: 'hose,garden' },
  { name: 'TerraForm Tools Folding Garden Stool', short: 'Garden stool', description: 'Portable stool with tool pouch.', tags: 'gardensool,outdoor' },
  { name: 'Kelp & Clay Compost Bin Countertop', short: 'Countertop compost bin', description: 'Charcoal-filtered kitchen compost caddy.', tags: 'compost,kitchen' },
  { name: 'Cascade Non-Stick Saucepan 18cm', short: 'Non-stick saucepan', description: 'Everyday saucepan with glass lid.', tags: 'saucepan,cookware' },
  { name: 'Nordvik Mixing Bowl Nest of 3', short: 'Mixing bowls', description: 'Nested mixing bowls with lids.', tags: 'mixingbowl,kitchen' },
  { name: 'Harbor Glass Food Storage Set', short: 'Glass food containers', description: 'Leakproof glass containers with lids.', tags: 'foodstorage,kitchen' },
  { name: 'Oak & Ember Utensil Crock Ceramic', short: 'Utensil crock', description: 'Ceramic crock for cooking tools.', tags: 'utensilholder,kitchen' },
  { name: 'Polaris Kitchen Timer Magnetic', short: 'Magnetic kitchen timer', description: 'Classic twist timer for the fridge.', tags: 'timer,kitchen' },
  { name: 'Brightfolio Under-Cabinet Puck Lights', short: 'Puck light kit', description: 'Three warm puck lights with remote.', tags: 'pucklights,kitchen' },
  { name: 'Keystone Shoe Rack Entry 3 Tier', short: '3-tier shoe rack', description: 'Slim entry shoe rack for eight pairs.', tags: 'shoerack,storage' },
  { name: 'Coppernest Vacuum Storage Bag Set', short: 'Vacuum storage bags', description: 'Space-saving bags for seasonal clothes.', tags: 'storagebags,home' },
  { name: 'Nightingale Blackout Eye Mask Gift', short: 'Sleep eye mask', description: 'Soft eye mask for better sleep.', tags: 'eyemask,sleep' },
  { name: 'Aurelia Weighted Blanket 7kg', short: '7kg weighted blanket', description: 'Evenly weighted blanket for wind-down.', tags: 'weightedblanket,sleep' },
  { name: 'Solstice Mattress Topper Foam', short: 'Foam mattress topper', description: 'Comfort topper for guest and main beds.', tags: 'mattresstopper,bedding' },
  { name: 'Summit Forge BBQ Tool Set', short: 'BBQ tool set', description: 'Tong, spatula and brush for grilling.', tags: 'bbq,grill' },
  { name: 'Harbor Outdoor Tablecloth Wipe Clean', short: 'Outdoor tablecloth', description: 'Wipe-clean cloth for patio tables.', tags: 'tablecloth,outdoor' },
  { name: 'Fieldcraft Bug Zapper Lantern', short: 'Mosquito lantern', description: 'Rechargeable lantern with bug zapper.', tags: 'lantern,outdoor' },
  { name: 'Verdant Vertical Wall Planter', short: 'Vertical wall planter', description: 'Wall pocket planter for herbs and greens.', tags: 'wallplanter,garden' },
  { name: 'Lumenora Touch Bedside Lamp', short: 'Touch bedside lamp', description: '3-level touch lamp for nightstands.', tags: 'bedsidelamp,lighting' },
  { name: 'Driftwood Scented Sachet Drawer Pack', short: 'Drawer sachets', description: 'Cedar-linen sachets for drawers.', tags: 'sachet,home' },
  { name: 'Helix Care Laundry Drying Rack Fold', short: 'Folding drying rack', description: 'Foldaway indoor drying rack.', tags: 'dryingrack,laundry' },
  { name: 'UrbanMesh Cable Management Box', short: 'Cable box', description: 'Hides power strips and tangled cables.', tags: 'cablebox,organiser' },
  { name: 'Paper & Pine Wall Calendar Linen', short: 'Linen wall calendar', description: 'Undated wall calendar with linen binding.', tags: 'calendar,home' },
  { name: 'NovaByte Wireless Doorbell Kit', short: 'Wireless doorbell', description: 'Plug-in chime with weatherproof button.', tags: 'doorbell,home' },
  { name: 'Bluefinch Hygrometer Desk Clock', short: 'Thermo-hygrometer clock', description: 'Shows room temperature and humidity.', tags: 'hygrometer,clock' },
  { name: 'Canopy Labs Grow Light Clip', short: 'Clip grow light', description: 'LED grow light for indoor plants.', tags: 'growlight,plants' },
  { name: 'Garden Lane Bird Feeder Hanging', short: 'Hanging bird feeder', description: 'Weatherproof feeder for balconies.', tags: 'birdfeeder,garden' },
  { name: 'TerraForm Tools Leaf Rake Expandable', short: 'Expandable leaf rake', description: 'Adjustable-head rake for lawn cleanup.', tags: 'rake,garden' },
  { name: 'Kelp & Clay Potting Mix 20L', short: 'Potting mix 20L', description: 'All-purpose indoor plant mix bag.', tags: 'soil,gardening' },
  { name: 'Oak & Ember Serving Tray Oval', short: 'Oval serving tray', description: 'Wood-look tray for breakfast in bed.', tags: 'tray,serving' },
  { name: 'Silkroad Teapot Ceramic 900ml', short: 'Ceramic teapot', description: 'Infuser teapot for loose leaf.', tags: 'teapot,kitchen' },
  { name: 'Cascade Brew French Press 1L', short: '1L French press', description: 'Borosilicate press for rich coffee.', tags: 'frenchpress,coffee' },
  { name: 'Nordvik Spice Rack Revolving', short: 'Revolving spice rack', description: 'Rotating rack with twelve jars.', tags: 'spicerack,kitchen' },
  { name: 'Harbor Oil & Vinegar Cruet Set', short: 'Oil and vinegar set', description: 'Glass cruets with pour spouts.', tags: 'cruet,kitchen' },
  { name: 'Polaris Placemat Woven Set of 4', short: 'Woven placemats', description: 'Four wipeable woven placemats.', tags: 'placemat,table' },
  { name: 'Aurelia Candle Holder Brass Pair', short: 'Brass candle holders', description: 'Pair of tapered brass holders.', tags: 'candleholder,decor' },
  { name: 'Cinder Lane Fireplace Tool Set Mini', short: 'Mini fireplace tools', description: 'Compact tool set for small fireplaces.', tags: 'fireplace,tools' },
  { name: 'Atlas Peak Picnic Blanket Outdoor', short: 'Picnic blanket', description: 'Water-resistant picnic blanket with pouch.', tags: 'picnic,outdoor' },
  { name: 'Summit Forge Camp Mug Enamel Pair', short: 'Enamel camp mugs', description: 'Two speckled enamel mugs.', tags: 'mug,camping' },
  { name: 'RoverPet Indoor Plant Mister', short: 'Plant mister', description: 'Fine-mist sprayer for houseplants.', tags: 'mister,plants' },
  { name: 'Motorlane Garage Hook Heavy Duty 4pk', short: 'Heavy garage hooks', description: 'Four steel hooks for bikes and tools.', tags: 'hooks,garage' },
  { name: 'Polaris Nesting Nightstand Pair', short: 'Nesting nightstands', description: 'Two nesting bedside tables in warm wood tone.', tags: 'nightstand,furniture' },
  { name: 'Harbor Bathrobe Waffle Weave', short: 'Waffle bathrobe', description: 'Soft waffle-weave robe for spa mornings.', tags: 'bathrobe,bath' },
  { name: 'Verdant Moss Pole Plant Support', short: 'Moss pole support', description: 'Coir moss pole for climbing houseplants.', tags: 'plantsupport,plants' },
  { name: 'Lumenora Candle Warmer Lamp', short: 'Candle warmer lamp', description: 'Warms jar candles without an open flame.', tags: 'candlewarmer,lighting' },
  { name: 'Oak & Ember Wine Rack Countertop', short: 'Countertop wine rack', description: 'Holds six bottles on the counter or pantry.', tags: 'winerack,kitchen' },
  { name: 'Silkroad Chopstick Rest Set Ceramic', short: 'Chopstick rests', description: 'Six ceramic rests for Asian dining sets.', tags: 'tableware,ceramic' },
  { name: 'Atlas Peak Fire Pit Cover Round', short: 'Fire pit cover', description: 'Weather cover for round patio fire pits.', tags: 'firepit,outdoor' },
]

async function urlOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, redirect: 'follow' })
    clearTimeout(t)
    const ct = res.headers.get('content-type') || ''
    if (res.ok && ct.startsWith('image/')) return true
    if (res.ok && (url.includes('loremflickr.com') || url.includes('staticflickr.com') || url.includes('dummyjson.com')))
      return true
    return false
  } catch {
    return false
  }
}

function flickr(tags: string, lock: number) {
  return `https://loremflickr.com/800/800/${encodeURIComponent(tags)}?lock=${lock}`
}

async function loadDummyJsonHome(exclude: Set<string>): Promise<Item[]> {
  const cats = new Set(['home-decoration', 'furniture', 'kitchen-accessories'])
  const res = await fetch('https://dummyjson.com/products?limit=200')
  const data = (await res.json()) as { products: any[] }
  const out: Item[] = []
  for (const p of data.products || []) {
    if (!cats.has(p.category)) continue
    const name = String(p.title).trim()
    if (exclude.has(name.toLowerCase())) continue
    exclude.add(name.toLowerCase())
    const images = Array.from(new Set([...(p.images || []), p.thumbnail].filter(Boolean))) as string[]
    const tags =
      p.category === 'furniture'
        ? 'furniture,home'
        : p.category === 'home-decoration'
          ? 'homedecor,interior'
          : 'kitchen,cookware'
    out.push({
      name,
      short: p.brand ? `${p.brand} · ${name}` : name,
      description: p.description || name,
      tags,
      images,
    })
  }
  return out
}

async function main() {
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'home-garden').single()
  if (!cat) throw new Error('Home & Garden category missing')

  const { data: existing } = await supabase.from('products').select('id, name').eq('categoryId', cat.id)
  const ids = (existing || []).map((p) => p.id)
  console.log('Existing', ids.length)

  const keep = new Set<string>()
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40)
    const { data: oi } = await supabase.from('order_items').select('productId').in('productId', chunk)
    for (const r of oi || []) keep.add(r.productId)
  }
  console.log('Keep (orders)', keep.size)

  for (const id of keep) {
    const sale = round2(325 + Math.random() * 75)
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)
    await supabase
      .from('products')
      .update({
        price: saleNorm,
        salePrice: saleNorm,
        wholesalePrice: wholesale,
        costPrice: wholesale,
        comparePrice: round2(saleNorm * 1.15),
        status: 'PUBLISHED',
      })
      .eq('id', id)
  }

  const toDelete = ids.filter((id) => !keep.has(id))
  for (let i = 0; i < toDelete.length; i += 40) {
    const chunk = toDelete.slice(i, i + 40)
    await supabase.from('product_images').delete().in('productId', chunk)
    const { error } = await supabase.from('products').delete().in('id', chunk)
    if (error) throw error
  }
  console.log('Deleted', toDelete.length)

  const exclude = new Set<string>()
  const { data: kept } = await supabase.from('products').select('name').eq('categoryId', cat.id)
  for (const p of kept || []) exclude.add(p.name.toLowerCase())
  for (const cid of [LIFE_ID, ACC_ID]) {
    const { data: rows } = await supabase.from('products').select('name').eq('categoryId', cid)
    for (const p of rows || []) exclude.add(p.name.toLowerCase())
  }

  const dj = await loadDummyJsonHome(exclude)
  console.log('DummyJSON home usable', dj.length)

  const curated = CATALOG.filter((c) => !exclude.has(c.name.toLowerCase()))
  const seen = new Set(exclude)
  const pool: Item[] = []
  for (const item of [...dj, ...curated]) {
    const k = item.name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    pool.push(item)
  }

  const need = TARGET - keep.size
  if (pool.length < need) throw new Error(`Only ${pool.length}/${need} unique items`)
  const selected = pool.slice(0, need)

  const runTag = Date.now().toString(36)
  const preview = ['index,name,price,image']
  const usedImg = new Set<string>()

  console.log(`Inserting ${selected.length} Home & Garden products...`)
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    let images: string[] = []

    if (item.images?.length) {
      for (const img of item.images) {
        if (usedImg.has(img)) continue
        if (await urlOk(img)) {
          images.push(img)
          usedImg.add(img)
        }
      }
    }

    if (!images.length) {
      const lock = 12000 + i * 19 + item.name.length
      const url = flickr(item.tags, lock)
      if (await urlOk(url)) {
        images = [url]
      } else {
        const url2 = flickr(item.tags, lock + 111)
        if (!(await urlOk(url2))) throw new Error(`No image for ${item.name}`)
        images = [url2]
      }
      usedImg.add(images[0])
    }

    const sale = round2(310 + i * 6.75 + (i % 8) * 2.1)
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)
    if (saleNorm <= 300) throw new Error('price <= 300')

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `hg-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.14),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `HG-${String(i + 1).padStart(3, '0')}-${runTag}`,
        stock: 16 + (i % 55),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 10,
        isPromoted: i % 8 === 0,
        rating: round2(3.8 + (i % 12) * 0.1),
        totalReviews: 4 + (i % 30),
        totalSales: i % 22,
        views: 20 + i * 3,
      })
      .select('id')
      .single()
    if (error || !product) throw error || new Error('insert failed')

    const rows = images.slice(0, 4).map((url, idx) => ({
      productId: product.id,
      url,
      alt: item.name,
      sortOrder: idx,
      isPrimary: idx === 0,
    }))
    const { error: imgErr } = await supabase.from('product_images').insert(rows)
    if (imgErr) throw imgErr

    preview.push([i + 1, `"${item.name.replace(/"/g, '""')}"`, saleNorm, images[0]].join(','))
    if ((i + 1) % 20 === 0) console.log(`  … ${i + 1}/${need}`)
  }

  const { data: final } = await supabase
    .from('products')
    .select('name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const names = (final || []).map((p) => p.name)
  const prices = (final || []).map((p) => Number(p.price))

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  writeFileSync(join(process.cwd(), 'catalog', 'home-garden-unique-live.csv'), preview.join('\n'))

  console.log('\n=== Home & Garden done ===')
  console.log('Published', names.length, 'unique', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Photo-N', names.filter((n) => /—\s*Photo\s*\d+/i.test(n)).length)
  console.log('Price', Math.min(...prices), '-', Math.max(...prices), '<=300:', prices.filter((p) => p <= 300).length)
  for (const n of names.slice(0, 8)) console.log(' -', n)

  if (names.length < TARGET) throw new Error('under 100')
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error('dup names')
  if (prices.some((p) => p <= 300)) throw new Error('cheap prices')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
