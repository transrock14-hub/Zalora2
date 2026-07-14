/**
 * Accessories: ≥100 unique products, theme-matched Flickr photos (loremflickr),
 * prices > $300. Keeps order-linked products. No "Photo N" duplicates.
 *
 * Run: npx tsx scripts/rebuild-accessories-unique.ts
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
const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70)

type Item = {
  name: string
  short: string
  description: string
  tags: string // loremflickr tags
  images?: string[]
}

const CATALOG: Item[] = [
  { name: 'Nordvik Chronograph Steel Watch N-420', short: 'Stainless chronograph', description: 'Chronograph watch with steel bracelet and luminous hands.', tags: 'wristwatch,watch' },
  { name: 'Harborfield Classic Leather Watch', short: 'Leather strap dress watch', description: 'Minimal dial dress watch on genuine leather strap.', tags: 'wristwatch,leather' },
  { name: 'Summit Forge Dive Watch 200M', short: 'Dive sport watch', description: 'Rotating bezel dive watch built for active wear.', tags: 'divewatch,wristwatch' },
  { name: 'Aurelia Slim Rose Gold Watch', short: 'Rose gold mesh watch', description: 'Slim rose-gold tone watch with mesh bracelet.', tags: 'wristwatch,gold' },
  { name: 'Keystone Field Watch Olive', short: 'Field watch', description: 'High-contrast field watch with nylon strap.', tags: 'wristwatch,military' },
  { name: 'Polaris Quartz Everyday Watch', short: 'Everyday quartz watch', description: 'Reliable quartz watch for daily wear.', tags: 'wristwatch,watch' },
  { name: 'Lumenora Square Dial Watch', short: 'Square dial watch', description: 'Modern square-case watch with brushed finish.', tags: 'wristwatch,fashion' },
  { name: 'Verdant Two-Tone Bracelet Watch', short: 'Two-tone watch', description: 'Two-tone bracelet watch with date window.', tags: 'wristwatch,bracelet' },
  { name: 'Atlas Peak Trail Watch', short: 'Outdoor trail watch', description: 'Rugged outdoor watch with reinforced strap.', tags: 'sportswatch,wristwatch' },
  { name: 'Silkroad Pearl Face Watch', short: 'Pearl dial watch', description: 'Elegant pearl-white dial with slim bracelet.', tags: 'wristwatch,elegant' },
  { name: 'Cascade Brew Mesh Bracelet Watch', short: 'Mesh bracelet watch', description: 'Ultra-thin mesh bracelet quartz watch.', tags: 'wristwatch,mesh' },
  { name: 'Canopy Labs Sport Activity Band', short: 'Fitness band', description: 'Lightweight activity band with swap straps.', tags: 'smartwatch,fitness' },
  { name: 'Bluefinch Aviator Sunglasses Gold', short: 'Gold aviators', description: 'Metal aviators with UV400 lenses.', tags: 'sunglasses,aviator' },
  { name: 'Nightingale Wayfarer Acetate Black', short: 'Black wayfarers', description: 'Acetate wayfarers with polarised lenses.', tags: 'sunglasses,wayfarer' },
  { name: 'Cinder Lane Sport Wrap Sunglasses', short: 'Sport wrap shades', description: 'Wrap frames for cycling and running.', tags: 'sunglasses,sport' },
  { name: 'Solstice Round Metal Sunglasses', short: 'Round metal sunglasses', description: 'Retro round frames with gradient lenses.', tags: 'sunglasses,round' },
  { name: 'Driftwood Tortoise Shell Sunglasses', short: 'Tortoise sunglasses', description: 'Tortoise acetate with warm lenses.', tags: 'sunglasses,tortoise' },
  { name: 'Coppernest Cat-Eye Sunglasses', short: 'Cat-eye sunglasses', description: 'Cat-eye frames with gold accents.', tags: 'sunglasses,cateye' },
  { name: 'Fieldcraft Mirrored Sport Shades', short: 'Mirrored sport shades', description: 'Mirrored lenses with anti-slip pads.', tags: 'sunglasses,mirror' },
  { name: 'Oak & Ember Wooden Arm Sunglasses', short: 'Wood-arm sunglasses', description: 'Frames with wood-texture temples.', tags: 'sunglasses,wood' },
  { name: 'Brightfolio Clear Fashion Frames', short: 'Clear fashion glasses', description: 'Clear non-prescription fashion frames.', tags: 'eyeglasses,clear' },
  { name: 'Cascade Mirror Aviator Silver', short: 'Silver mirror aviators', description: 'Silver mirrored aviator sunglasses.', tags: 'sunglasses,aviator' },
  { name: 'Kelp & Clay Bamboo Frame Sunglasses', short: 'Bamboo sunglasses', description: 'Bamboo-arm frames with polarised lenses.', tags: 'sunglasses,bamboo' },
  { name: 'Brightfolio Reading Glasses +1.50', short: 'Readers +1.50', description: 'Lightweight readers in a slim case.', tags: 'readingglasses,eyeglasses' },
  { name: 'Keystone Reversible Leather Belt', short: 'Reversible leather belt', description: 'Reversible black/brown leather belt.', tags: 'belt,leather' },
  { name: 'Summit Forge Braided Casual Belt', short: 'Braided belt', description: 'Stretch braid belt with brushed buckle.', tags: 'belt,braided' },
  { name: 'Harbor Canvas Webbing Belt Olive', short: 'Canvas webbing belt', description: 'Adjustable olive canvas belt.', tags: 'belt,canvas' },
  { name: 'Aurelia Slim Dress Belt Cognac', short: 'Slim dress belt', description: 'Narrow cognac belt for tailored looks.', tags: 'belt,leather' },
  { name: 'Nordvik Plaque Buckle Belt', short: 'Plaque buckle belt', description: 'Wide belt with polished plaque buckle.', tags: 'belt,buckle' },
  { name: 'Atlas Peak Hiking Utility Belt', short: 'Utility belt', description: 'Quick-release belt with gear loops.', tags: 'belt,tactical' },
  { name: 'Verdant Suede Texture Belt Sand', short: 'Suede-look belt', description: 'Soft sand-tone belt.', tags: 'belt,suede' },
  { name: 'Polaris Perforated Leather Belt', short: 'Perforated belt', description: 'Breathable perforated leather belt.', tags: 'belt,leather' },
  { name: 'Motorlane Racing Stripe Belt', short: 'Racing stripe belt', description: 'Sport webbing belt with contrast stripe.', tags: 'belt,sport' },
  { name: 'Coppernest Suspenders Leather', short: 'Leather suspenders', description: 'Button-on leather suspenders.', tags: 'suspenders,leather' },
  { name: 'Silkroad Bifold Wallet Midnight', short: 'Bifold wallet', description: 'Slim midnight bifold with card slots.', tags: 'wallet,leather' },
  { name: 'Lumenora Zip-Around Wallet', short: 'Zip travel wallet', description: 'Zip wallet with passport sleeve.', tags: 'wallet,travel' },
  { name: 'Coppernest Cardholder Minimal', short: 'Minimal cardholder', description: 'Three-slot front-pocket cardholder.', tags: 'wallet,cardholder' },
  { name: 'Fieldcraft RFID Blocking Wallet', short: 'RFID wallet', description: 'Shielded wallet for contactless cards.', tags: 'wallet,rfid' },
  { name: 'Oak & Ember Coin Pouch Wallet', short: 'Coin pouch wallet', description: 'Compact wallet with coin zip.', tags: 'wallet,leather' },
  { name: 'Nightingale Continental Wallet', short: 'Continental wallet', description: 'Long wallet with organised sections.', tags: 'wallet,leather' },
  { name: 'Nordvik Steel Money Clip', short: 'Steel money clip', description: 'Slim steel clip for notes and cards.', tags: 'moneyclip,wallet' },
  { name: 'Paper & Pine Journal Band Wallet', short: 'Band wallet', description: 'Elastic wallet that wraps a notebook.', tags: 'wallet,minimal' },
  { name: 'Aurelia Layered Gold Chain Necklace', short: 'Layered necklace', description: 'Three graduated chains for layering.', tags: 'necklace,gold' },
  { name: 'Solstice Pearl Stud Earrings', short: 'Pearl studs', description: 'Classic pearl stud earrings.', tags: 'earrings,pearl' },
  { name: 'Nordvik Signet Ring Brushed Steel', short: 'Signet ring', description: 'Brushed steel everyday signet.', tags: 'ring,signet' },
  { name: 'Verdant Hoop Earrings Medium', short: 'Medium hoops', description: 'Lightweight hinged hoop earrings.', tags: 'earrings,hoops' },
  { name: 'Atlas Peak Beaded Bracelet Set', short: 'Beaded bracelet set', description: 'Trio of stacking beaded bracelets.', tags: 'bracelet,beads' },
  { name: 'Cinder Lane Crystal Tennis Bracelet', short: 'Tennis bracelet', description: 'Continuous crystal bracelet with clasp.', tags: 'bracelet,diamond' },
  { name: 'Harbor Drop Earrings Silver', short: 'Silver drop earrings', description: 'Polished silver-tone drop earrings.', tags: 'earrings,silver' },
  { name: 'Keystone Wide Cuff Bracelet', short: 'Wide cuff', description: 'Open cuff bracelet with engraved band.', tags: 'bracelet,cuff' },
  { name: 'Polaris Delicate Chain Anklet', short: 'Chain anklet', description: 'Fine adjustable chain anklet.', tags: 'anklet,jewellery' },
  { name: 'Silkroad Initial Charm Necklace', short: 'Initial necklace', description: 'Pendant charm on a fine cable chain.', tags: 'necklace,charm' },
  { name: 'Lumenora Stackable Ring Trio', short: 'Stackable rings', description: 'Three thin stackable rings.', tags: 'rings,gold' },
  { name: 'Driftwood Leather Cord Pendant', short: 'Leather cord necklace', description: 'Adjustable leather cord with metal pendant.', tags: 'necklace,leather' },
  { name: 'Motorlane Carbon Fibre Bracelet', short: 'Carbon bracelet', description: 'Lightweight carbon-look bracelet.', tags: 'bracelet,men' },
  { name: 'Helix Care Glasses Chain Gold', short: 'Glasses chain', description: 'Gold-tone chain for eyeglasses.', tags: 'glasseschain,jewellery' },
  { name: 'Solstice Ear Cuff Duo', short: 'Ear cuff set', description: 'No-pierce ear cuffs for stacking.', tags: 'earcuff,jewellery' },
  { name: 'Cinder Lane Floral Brooch', short: 'Floral brooch', description: 'Enamel floral brooch with secure pin.', tags: 'brooch,jewellery' },
  { name: 'Polaris Enamel Lapel Pin Set', short: 'Lapel pin set', description: 'Three enamel lapel pins.', tags: 'lapelpin,jewellery' },
  { name: 'Summit Forge Wool Fedora Charcoal', short: 'Wool fedora', description: 'Structured charcoal wool fedora.', tags: 'fedora,hat' },
  { name: 'Bluefinch Dad Cap Washed Navy', short: 'Navy dad cap', description: 'Soft washed cotton adjustable cap.', tags: 'cap,hat' },
  { name: 'Fieldcraft Bucket Hat Khaki', short: 'Khaki bucket hat', description: 'Packable sun bucket hat.', tags: 'buckethat,hat' },
  { name: 'UrbanMesh Rib Knit Beanie', short: 'Rib knit beanie', description: 'Soft ribbed winter beanie.', tags: 'beanie,hat' },
  { name: 'Oak & Ember Straw Boater', short: 'Straw boater hat', description: 'Flat-top straw hat for summer.', tags: 'strawhat,hat' },
  { name: 'Nightingale Silk Square Scarf', short: 'Silk scarf', description: 'Printed silk square scarf.', tags: 'scarf,silk' },
  { name: 'Polaris Cashmere Blend Scarf', short: 'Cashmere-blend scarf', description: 'Soft heather scarf for cold weather.', tags: 'scarf,wool' },
  { name: 'Aurelia Lightweight Summer Scarf', short: 'Sheer summer scarf', description: 'Airy scarf for light layering.', tags: 'scarf,fashion' },
  { name: 'Verdant Plaid Winter Scarf', short: 'Plaid scarf', description: 'Classic plaid winter scarf.', tags: 'scarf,plaid' },
  { name: 'Coppernest Infinity Loop Scarf', short: 'Infinity scarf', description: 'Loop scarf that doubles as a wrap.', tags: 'scarf,infinity' },
  { name: 'Harbor Leather Touchscreen Gloves', short: 'Touchscreen gloves', description: 'Leather gloves with conductive tips.', tags: 'gloves,leather' },
  { name: 'Keystone Knit Touch Gloves', short: 'Knit touch gloves', description: 'Soft knit gloves for phone use.', tags: 'gloves,winter' },
  { name: 'Nordvik Silk Necktie Navy Dot', short: 'Navy silk tie', description: 'Navy silk necktie with subtle dots.', tags: 'necktie,silk' },
  { name: 'Summit Forge Slim Knit Tie', short: 'Slim knit tie', description: 'Textured slim knit tie.', tags: 'necktie,knit' },
  { name: 'Lumenora Satin Bow Tie Black', short: 'Black bow tie', description: 'Pre-tied satin bow for formals.', tags: 'bowtie,formal' },
  { name: 'Oak & Ember Linen Pocket Square', short: 'Linen pocket square', description: 'Pressed linen pocket square.', tags: 'pocketsquare,linen' },
  { name: 'Atlas Peak Hex Cufflink Set', short: 'Hex cufflinks', description: 'Brushed steel hex cufflinks.', tags: 'cufflinks,men' },
  { name: 'Silkroad Minimal Tie Bar', short: 'Tie bar', description: 'Slim silver-tone tie bar.', tags: 'tiebar,men' },
  { name: 'Fieldcraft Mini Crossbody Pouch', short: 'Mini crossbody', description: 'Hands-free pouch for cards and keys.', tags: 'bag,crossbody' },
  { name: 'Brightfolio Compact Belt Bag', short: 'Belt bag', description: 'Compact bag for phone and wallet.', tags: 'fannypack,bag' },
  { name: 'Aurelia Evening Clutch Chain', short: 'Clutch chain', description: 'Detachable chain for evening clutches.', tags: 'handbag,chain' },
  { name: 'Helix Care Sunglasses Hard Case', short: 'Sunglasses case', description: 'Crush-resistant hard case with cloth.', tags: 'case,sunglasses' },
  { name: 'Oak & Ember Travel Watch Roll', short: 'Watch travel roll', description: 'Protects two watches on the road.', tags: 'watchroll,travel' },
  { name: 'Coppernest Jewellery Travel Case', short: 'Jewellery case', description: 'Zipped case with ring rolls.', tags: 'jewellerybox,case' },
  { name: 'Solstice Leather Key Organiser', short: 'Key organiser', description: 'Flat leather organiser for keys.', tags: 'keys,leather' },
  { name: 'Driftwood Badge Lanyard', short: 'Badge lanyard', description: 'Woven lanyard with metal clip.', tags: 'lanyard,badge' },
  { name: 'Cinder Lane Compact Auto Umbrella', short: 'Auto compact umbrella', description: 'One-touch umbrella in slim sleeve.', tags: 'umbrella,compact' },
  { name: 'Polaris Classic Stick Umbrella', short: 'Stick umbrella', description: 'Full-size umbrella with curved handle.', tags: 'umbrella,rain' },
  { name: 'Aurelia Silk Scrunchie Set', short: 'Silk scrunchie set', description: 'Three gentle silk scrunchies.', tags: 'scrunchie,hair' },
  { name: 'Nightingale Large Hair Claw', short: 'Hair claw clip', description: 'Strong claw clip for thick hair.', tags: 'hairclip,hair' },
  { name: 'Harbor Soft Knot Headband', short: 'Knot headband', description: 'Soft fabric knot headband.', tags: 'headband,hair' },
  { name: 'NovaByte Leather Cord Wrap Duo', short: 'Cord wraps', description: 'Leather wraps for charging cables.', tags: 'cable,organiser' },
  { name: 'Voltura Tracker Leather Sleeve', short: 'Tracker sleeve', description: 'Leather sleeve for bluetooth trackers.', tags: 'leather,case' },
  { name: 'Bluefinch Phone Ring Grip', short: 'Phone ring grip', description: 'Matte ring grip and stand.', tags: 'phone,accessory' },
  { name: 'UrbanMesh Earbud Case Keychain', short: 'Earbud keychain case', description: 'Protective case that clips to keys.', tags: 'earbuds,case' },
  { name: 'Lumenora Gold Compact Mirror', short: 'Gold compact mirror', description: 'Double-sided compact with pouch.', tags: 'mirror,compact' },
  { name: 'Silkroad Folding Lace Fan', short: 'Folding fan', description: 'Decorative folding fan for events.', tags: 'fan,accessory' },
  { name: 'Verdant Beaded Hair Comb', short: 'Beaded hair comb', description: 'Decorative beaded comb for updos.', tags: 'haircomb,hair' },
  { name: 'Atlas Peak Woven Friendship Bracelet', short: 'Friendship bracelet', description: 'Hand-style woven bracelet set of two.', tags: 'bracelet,friendship' },
  { name: 'Harbor Minimal Stud Earrings Steel', short: 'Steel stud earrings', description: 'Hypoallergenic steel everyday studs.', tags: 'earrings,steel' },
  { name: 'Keystone Canvas Card Sleeve', short: 'Canvas card sleeve', description: 'Slim canvas sleeve for cards and cash.', tags: 'wallet,canvas' },
]

async function urlOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, redirect: 'follow' })
    clearTimeout(t)
    const ct = res.headers.get('content-type') || ''
    // loremflickr redirects to jpg; accept image/* or successful opaque image bodies
    if (res.ok && ct.startsWith('image/')) return true
    if (res.ok && (url.includes('loremflickr.com') || url.includes('staticflickr.com'))) return true
    return false
  } catch {
    return false
  }
}

function flickr(tags: string, lock: number) {
  // Real Flickr photos filtered by tags; lock = stable unique image
  return `https://loremflickr.com/800/800/${encodeURIComponent(tags)}?lock=${lock}`
}

async function loadDummyJsonAccessories(exclude: Set<string>): Promise<Item[]> {
  const cats = new Set(['mens-watches', 'womens-watches', 'womens-jewellery', 'sunglasses'])
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
      p.category === 'sunglasses'
        ? 'sunglasses'
        : p.category.includes('jewellery')
          ? 'jewellery,earrings'
          : 'wristwatch,watch'
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
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'accessories').single()
  if (!cat) throw new Error('Accessories missing')

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
    const sale = round2(318 + (keep.size > 1 ? Math.random() * 90 : 40))
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

  const { data: kept } = await supabase.from('products').select('name').eq('categoryId', cat.id)
  const exclude = new Set((kept || []).map((p) => p.name.toLowerCase()))
  const { data: life } = await supabase
    .from('products')
    .select('name')
    .eq('categoryId', 'a6bbf30c-2517-4175-b215-575e96afeacd')
  for (const p of life || []) exclude.add(p.name.toLowerCase())

  const dj = await loadDummyJsonAccessories(exclude)
  console.log('DummyJSON unique', dj.length)

  const curated = CATALOG.filter((c) => !exclude.has(c.name.toLowerCase()))
  const seen = new Set<string>(exclude)
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

  console.log(`Inserting ${selected.length} accessories...`)
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
      // Theme-tagged unique Flickr photo (real photo, locked per product)
      const lock = 8000 + i * 17 + item.name.length
      const url = flickr(item.tags, lock)
      if (!(await urlOk(url))) {
        // retry alternate lock
        const url2 = flickr(item.tags, lock + 99)
        if (!(await urlOk(url2))) throw new Error(`No image for ${item.name}`)
        images = [url2]
      } else {
        images = [url]
      }
      usedImg.add(images[0])
    }

    const sale = round2(308 + i * 7.25 + (i % 6) * 1.75)
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)
    if (saleNorm <= 300) throw new Error('price <= 300')

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug: `acc-${slugify(item.name)}-${runTag}-${i + 1}`,
        description: item.description,
        shortDesc: item.short,
        price: saleNorm,
        comparePrice: round2(saleNorm * 1.14),
        wholesalePrice: wholesale,
        salePrice: saleNorm,
        costPrice: wholesale,
        sku: `ACC-${String(i + 1).padStart(3, '0')}-${runTag}`,
        stock: 18 + (i % 60),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 10,
        isPromoted: i % 8 === 0,
        rating: round2(3.8 + (i % 12) * 0.1),
        totalReviews: 4 + (i % 28),
        totalSales: i % 18,
        views: 25 + i * 2,
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
  writeFileSync(join(process.cwd(), 'catalog', 'accessories-unique-live.csv'), preview.join('\n'))

  console.log('\n=== Accessories done ===')
  console.log('Published', names.length, 'unique', new Set(names.map((n) => n.toLowerCase())).size)
  console.log('Photo-N', names.filter((n) => /Photo\s*\d+/i.test(n)).length)
  console.log('Price', Math.min(...prices), '-', Math.max(...prices), '<=300:', prices.filter((p) => p <= 300).length)
  console.log('Samples:')
  for (const n of names.slice(0, 10)) console.log(' -', n)

  if (names.length < TARGET) throw new Error('under 100')
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw new Error('dup names')
  if (prices.some((p) => p <= 300)) throw new Error('cheap prices')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
