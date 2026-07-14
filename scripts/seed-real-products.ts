/**
 * Seed 25 products per category with REAL (non-AI) product photos.
 *
 * - Images: curated Unsplash photo URLs per category. Every URL is validated
 *   (HTTP 200) before use; broken ones are dropped. Categories with too few
 *   working images fall back to a proven generic product-photo pool.
 * - Pricing: varied price, comparePrice (creates "deals"), salePrice,
 *   wholesalePrice (so the wholesale/reseller flow works).
 * - Sections: spreads isFeatured / isPromoted and recency so the homepage
 *   Featured, New Arrivals, and Deals sections populate automatically.
 * - Additive: uses unique slugs (prefixed `real-`) so it does NOT overwrite
 *   existing products. Safe to run more than once (adds a new batch each time).
 *
 * Run: npx tsx scripts/seed-real-products.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (read from .env.local).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

// ---- Load env from .env.local (no dotenv dependency) --------------------
function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local not found; rely on existing process env
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const PER_CATEGORY = 25
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`

// Proven-good product photos (already used in this repo). Used as a fallback
// so every product is guaranteed a real image even if a curated URL breaks.
const GENERIC_POOL = [
  '1542291026-7eec264c27ff', '1606107557195-0e29a4b5b4aa', '1549298916-b41d501d3772',
  '1600185365926-3a2ce3cdb9eb', '1583743814966-8936f5b7be1a', '1551537482-f2075a1d41f2',
  '1473966968600-fa801b869a1a', '1572804013309-59a88b7e92f1', '1434389677669-e08b4cac3105',
  '1511499767150-a48a237f0083', '1524805444758-089113d48a6d', '1584917865442-de89df76afd3',
  '1590874103328-eac38a683ce7', '1553062407-98eeb64c6a62',
].map(img)

// Curated candidate photos per category (validated at runtime).
const CANDIDATES: Record<string, string[]> = {
  lifestyle: ['1513885535751-8b9238bd345a', '1556228453-efd6c1ff04f6', '1481277542470-605612bd2d61', '1526170375885-4d8ecf77b99f', '1522708323590-d24dbb6b0267', '1516575334481-f85287c2c82d'],
  'men-shoes': ['1542291026-7eec264c27ff', '1606107557195-0e29a4b5b4aa', '1595950653106-6c9ebd614d3a', '1608231387042-66d1773070a5', '1491553895911-0055eca6402d', '1460353581641-37baddab0fa2', '1600185365926-3a2ce3cdb9eb'],
  'women-shoes': ['1549298916-b41d501d3772', '1595341888016-a392ef81b7de', '1543163521-1bf539c55dd2', '1596703263926-eb0762ee17e4', '1518049362265-d5b2a6467637', '1560769629-975ec94e6a86'],
  accessories: ['1511499767150-a48a237f0083', '1524805444758-089113d48a6d', '1523275335684-37898b6baf30', '1508685096489-7aacd43bd3b1', '1572635196237-14b3f281503f', '1611085583191-a3b181a88401'],
  'men-clothing': ['1583743814966-8936f5b7be1a', '1551537482-f2075a1d41f2', '1473966968600-fa801b869a1a', '1521572163474-6864f9cf17ab', '1576566588028-4147f3842f27', '1618354691373-d851c5c3a990'],
  'women-bags': ['1584917865442-de89df76afd3', '1590874103328-eac38a683ce7', '1548036328-c9fa89d128fa', '1566150905458-1bf1fc113f0d', '1591561954557-26941169b49e', '1594223274512-ad4803739b7c'],
  'men-bags': ['1553062407-98eeb64c6a62', '1547949003-9792a18a2601', '1622560480605-d83c853bc5c3', '1548546738-8509cb246ed3', '1581605405669-fcdf81165afa', '1590874103328-eac38a683ce7'],
  'women-clothing': ['1572804013309-59a88b7e92f1', '1434389677669-e08b4cac3105', '1595777457583-95e059d581b8', '1490481651871-ab68de25d43d', '1496747611176-843222e1e57c', '1483985988355-763728e1935b'],
  girls: ['1519238263530-99bdd11df2ea', '1503919545889-aef636e10ad4', '1471286174890-9c112ffca5b4', '1522771930-fbb1c9fe6f9d', '1518831959646-742c3a14ebf7'],
  boys: ['1503944583220-79d8926ad5e2', '1519457431-44ccd64a579b', '1560506840-ec148e82a604', '1544413660-299165566b1d', '1602030638412-bb8dcc0bc8b0'],
  electronics: ['1505740420928-5e560c06d30e', '1546435770-a3e426bf472b', '1523275335684-37898b6baf30', '1498049794561-7780e7231661', '1572569511254-d8f925fe2cbb', '1600294037681-c80b4cb5b434'],
  'home-garden': ['1586023492125-27b2c045efd7', '1567016432779-094069958ea5', '1513694203232-719a280e022f', '1524758631624-e2822e304c36', '1522708323590-d24dbb6b0267', '1616486338812-3dadae4b4ace'],
}

const NAMES: Record<string, string[]> = {
  lifestyle: ['Gift Set', 'Lifestyle Bundle', 'Curated Box', 'Essential Kit', 'Daily Companion', 'Luxe Set', 'Trendy Pack', 'Classic Collection', 'Modern Essentials', 'Style Kit'],
  'men-shoes': ['Oxford Shoes', 'Running Sneakers', 'Casual Loafers', 'Leather Boots', 'Canvas Sneakers', 'Formal Derby', 'Slip-On Shoes', 'Athletic Trainers', 'Desert Boots', 'High-Tops'],
  'women-shoes': ['Heeled Sandals', 'Ankle Boots', 'Ballet Flats', 'Platform Heels', 'Wedges', 'Espadrilles', 'Pumps', 'Loafers', 'Strappy Heels', 'Comfort Sneakers'],
  accessories: ['Sunglasses', 'Leather Belt', 'Silk Scarf', 'Watch', 'Cap', 'Wallet', 'Bracelet', 'Necklace', 'Earrings', 'Gloves'],
  'men-clothing': ['Cotton T-Shirt', 'Oxford Shirt', 'Chino Pants', 'Denim Jacket', 'Polo Shirt', 'Sweater', 'Blazer', 'Shorts', 'Hoodie', 'Overcoat'],
  'women-bags': ['Tote Bag', 'Crossbody Bag', 'Clutch', 'Backpack', 'Satchel', 'Bucket Bag', 'Shoulder Bag', 'Mini Bag', 'Straw Bag', 'Leather Handbag'],
  'men-bags': ['Messenger Bag', 'Backpack', 'Briefcase', 'Duffel Bag', 'Laptop Bag', 'Travel Bag', 'Waist Pack', 'Crossbody Bag', 'Holdall', 'Weekender'],
  'women-clothing': ['Midi Dress', 'Blouse', 'High-Waist Pants', 'Blazer', 'Pleated Skirt', 'Jumpsuit', 'Cardigan', 'Trench Jacket', 'Knit Top', 'Wrap Coat'],
  girls: ['Floral Dress', 'Graphic Tee', 'Leggings', 'Knit Sweater', 'Tulle Skirt', 'Denim Jacket', 'Sneakers', 'Hair Clip Set', 'Backpack', 'Party Dress'],
  boys: ['Polo Shirt', 'Cargo Pants', 'Hoodie', 'Bomber Jacket', 'Shorts', 'Sneakers', 'Cap', 'Backpack', 'Graphic Tee', 'Slim Jeans'],
  electronics: ['Wireless Earbuds', 'Smart Watch', 'Power Bank', 'Phone Stand', 'Cable Set', 'Fast Charger', 'Bluetooth Speaker', 'Tablet Case', 'Laptop Sleeve', 'USB Hub'],
  'home-garden': ['Throw Pillow', 'Candle Set', 'Ceramic Vase', 'Area Rug', 'Plant Pot', 'Cozy Blanket', 'Table Lamp', 'Wall Art', 'Serving Tray', 'Storage Basket'],
}

const ADJECTIVES = ['Classic', 'Premium', 'Modern', 'Vintage', 'Luxe', 'Essential', 'Urban', 'Signature', 'Everyday', 'Deluxe', 'Sport', 'Elegant', 'Casual', 'Pro', 'Trendy', 'Refined', 'Bold', 'Minimal']

const SHORT_DESCS = [
  'Premium quality. Designed for comfort and style.',
  'A must-have for your collection.',
  'Perfect for everyday wear.',
  'Crafted with attention to detail.',
  'Trendy and versatile.',
  'Quality materials, timeless design.',
]
const DESCRIPTIONS = [
  'Made from high-quality materials for durability and comfort. Perfect for daily use or special occasions.',
  'Designed with style and functionality in mind. A versatile addition that pairs with multiple outfits.',
  'Premium craftsmanship, carefully selected to meet our quality standards and deliver great value.',
]

const rand = (min: number, max: number) => Math.random() * (max - min) + min
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const round2 = (n: number) => Math.round(n * 100) / 100

async function urlOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10000)
    let res = await fetch(url, { method: 'HEAD', signal: ctrl.signal })
    if (!res.ok) {
      res = await fetch(url, { method: 'GET', signal: ctrl.signal })
    }
    clearTimeout(t)
    return res.ok
  } catch {
    return false
  }
}

async function validatePool(urls: string[]): Promise<string[]> {
  const results = await Promise.all(urls.map(async (u) => ({ u, ok: await urlOk(u) })))
  return results.filter((r) => r.ok).map((r) => r.u)
}

async function main() {
  console.log('Validating generic fallback image pool...')
  const genericOk = await validatePool(GENERIC_POOL)
  console.log(`  ${genericOk.length}/${GENERIC_POOL.length} generic images OK`)
  if (genericOk.length === 0) {
    console.error('No working fallback images. Aborting.')
    process.exit(1)
  }

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('isActive', true)
    .order('sortOrder')
  if (catErr) throw catErr
  if (!categories?.length) {
    console.error('No categories found. Run the category seed first.')
    process.exit(1)
  }

  const runTag = Date.now().toString(36)
  let totalProducts = 0
  let totalImages = 0

  for (const category of categories) {
    const candidatePool = (CANDIDATES[category.slug] || []).map(img)
    console.log(`\n[${category.name}] validating ${candidatePool.length} curated images...`)
    let workingPool = await validatePool(candidatePool)
    console.log(`  ${workingPool.length} curated images OK`)
    if (workingPool.length < 3) {
      workingPool = Array.from(new Set([...workingPool, ...genericOk]))
      console.log(`  padded with generic pool -> ${workingPool.length} images`)
    }

    const baseNames = NAMES[category.slug] || Array.from({ length: 10 }, (_, i) => `Product ${i + 1}`)
    const usedNames = new Set<string>()

    const productsData: any[] = []
    const imagesBySlug = new Map<string, string[]>()

    for (let n = 1; n <= PER_CATEGORY; n++) {
      // Unique, human-readable name
      let name = ''
      for (let tries = 0; tries < 20; tries++) {
        name = `${pick(ADJECTIVES)} ${pick(baseNames)}`
        if (!usedNames.has(name)) break
      }
      if (usedNames.has(name)) name = `${name} ${n}`
      usedNames.add(name)

      const slug = `real-${category.slug}-${runTag}-${n}`

      const price = round2(rand(15, 220))
      const onSale = Math.random() < 0.6
      const comparePrice = onSale ? round2(price * rand(1.15, 1.45)) : null
      const salePrice = price
      const wholesalePrice = round2(price * rand(0.6, 0.8))
      const stock = 5 + Math.floor(Math.random() * 120)

      productsData.push({
        shopId: null,
        categoryId: category.id,
        name,
        slug,
        description: pick(DESCRIPTIONS),
        shortDesc: pick(SHORT_DESCS),
        price,
        comparePrice,
        wholesalePrice,
        salePrice,
        costPrice: null,
        sku: `REAL-${category.slug.toUpperCase().replace(/-/g, '')}-${runTag}-${n}`,
        barcode: null,
        stock,
        lowStockAlert: 5,
        weight: null,
        status: 'PUBLISHED',
        isFeatured: n <= 5, // ~5 featured per category
        isPromoted: n <= 3, // ~3 promoted per category
        rating: round2(rand(3.6, 5)),
        totalReviews: Math.floor(Math.random() * 400) + 10,
        totalSales: Math.floor(Math.random() * 80),
        views: Math.floor(Math.random() * 500),
      })

      // 1-3 images per product from the working pool
      const numImages = 1 + Math.floor(Math.random() * Math.min(3, workingPool.length))
      const shuffled = [...workingPool].sort(() => Math.random() - 0.5).slice(0, numImages)
      imagesBySlug.set(slug, shuffled)
    }

    // Insert products in batches
    const BATCH = 25
    for (let i = 0; i < productsData.length; i += BATCH) {
      const batch = productsData.slice(i, i + BATCH)
      const { data: inserted, error: insErr } = await supabase
        .from('products')
        .insert(batch)
        .select('id, slug, name')
      if (insErr) {
        console.error(`  insert error:`, insErr.message)
        throw insErr
      }
      totalProducts += inserted?.length || 0

      const imageRows: any[] = []
      for (const p of inserted || []) {
        const urls = imagesBySlug.get(p.slug) || []
        urls.forEach((url, idx) => {
          imageRows.push({
            productId: p.id,
            url,
            alt: `${p.name} - view ${idx + 1}`,
            sortOrder: idx,
            isPrimary: idx === 0,
          })
        })
      }
      if (imageRows.length > 0) {
        const { error: imgErr } = await supabase.from('product_images').insert(imageRows)
        if (imgErr) console.warn(`  image insert warning:`, imgErr.message)
        else totalImages += imageRows.length
      }
    }
    console.log(`  ✓ ${PER_CATEGORY} products created for ${category.name}`)
  }

  console.log(`\n✅ Done. Created ${totalProducts} products and ${totalImages} images across ${categories.length} categories.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
