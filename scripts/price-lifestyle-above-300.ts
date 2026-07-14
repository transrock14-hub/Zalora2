/**
 * Set all Lifestyle sale prices above $300 (wholesale = sales / 1.20).
 * Run: npx tsx scripts/price-lifestyle-above-300.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import { wholesalePriceFromSales, salesPriceFromWholesale } from '../src/lib/wholesale-pricing'

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

async function main() {
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'lifestyle')
    .single()
  if (!cat) throw new Error('Lifestyle category missing')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
    .order('name')
  if (error) throw error
  if (!products?.length) throw new Error('No lifestyle products')

  console.log(`Updating ${products.length} Lifestyle prices to > $300...`)

  for (let i = 0; i < products.length; i++) {
    // Distinct prices starting just above 300
    const sale = round2(305 + i * 8.75 + (i % 7) * 1.5)
    const wholesale = wholesalePriceFromSales(sale)
    const saleNorm = salesPriceFromWholesale(wholesale)
    if (saleNorm <= 300) throw new Error(`Sale still <= 300 for ${products[i].name}`)

    const { error: uerr } = await supabase
      .from('products')
      .update({
        price: saleNorm,
        salePrice: saleNorm,
        wholesalePrice: wholesale,
        costPrice: wholesale,
        comparePrice: round2(saleNorm * 1.18),
      })
      .eq('id', products[i].id)
    if (uerr) throw uerr

    if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}`)
  }

  const { data: check } = await supabase
    .from('products')
    .select('name, price, wholesalePrice')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')

  const prices = (check || []).map((p) => Number(p.price))
  const below = (check || []).filter((p) => Number(p.price) <= 300)
  console.log('min', Math.min(...prices), 'max', Math.max(...prices))
  console.log('below-or-equal 300:', below.length)
  console.log('samples:')
  for (const p of (check || []).slice(0, 5)) {
    console.log(`  ${p.name}: $${p.price} (ws $${p.wholesalePrice})`)
  }
  if (below.length) throw new Error('Some prices still <= 300')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
