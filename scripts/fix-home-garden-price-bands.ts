/**
 * Reassign Home & Garden prices into exact bands (10 each).
 * Run: npx tsx scripts/fix-home-garden-price-bands.ts
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const round2 = (n: number) => Math.round(n * 100) / 100

const BANDS = [
  { min: 300, max: 800, count: 10 },
  { min: 800, max: 2500, count: 10 },
  { min: 2500, max: 3000, count: 10 },
  { min: 3000, max: 4000, count: 10 },
  { min: 4000, max: 5000, count: 10 },
]

function buildPrices(): number[] {
  const prices: number[] = []
  for (const b of BANDS) {
    for (let i = 0; i < b.count; i++) {
      const t = b.count === 1 ? 0.5 : i / (b.count - 1)
      const lo = b.min === 300 ? 305 : b.min + 1
      prices.push(round2(lo + (b.max - lo) * t))
    }
  }
  return prices
}

async function main() {
  const prices = buildPrices()
  const { data: cat } = await supabase.from('categories').select('id').eq('slug', 'home-garden').single()
  if (!cat) throw new Error('missing category')

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
    .order('name')

  if (!products || products.length !== 50) {
    throw new Error(`expected 50 published HG products, got ${products?.length}`)
  }

  for (let i = 0; i < products.length; i++) {
    const sale = prices[i]
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)
    const { error } = await supabase
      .from('products')
      .update({
        price: saleNorm,
        salePrice: saleNorm,
        wholesalePrice: wholesale,
        costPrice: wholesale,
        comparePrice: round2(saleNorm * 1.12),
      })
      .eq('id', products[i].id)
    if (error) throw error
  }

  const { data: out } = await supabase
    .from('products')
    .select('price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const ps = (out || []).map((p) => Number(p.price))
  console.log('Rebalanced Home & Garden prices')
  for (const b of BANDS) {
    const n =
      b.min === 300
        ? ps.filter((p) => p >= 300 && p <= 800).length
        : ps.filter((p) => p > b.min && p <= b.max).length
    console.log(`  ${b.min}-${b.max}: ${n}`)
  }
  console.log('min/max', Math.min(...ps), Math.max(...ps))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
