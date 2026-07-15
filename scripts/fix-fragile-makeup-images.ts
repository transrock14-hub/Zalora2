/**
 * Replace fragile brand-CDN product images (Smashbox/Clinique/etc.) that break
 * through Hostinger Next.js image optimization with Makeup API CloudFront URLs.
 *
 * Run: npx tsx scripts/fix-fragile-makeup-images.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const envRaw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  for (const line of envRaw.split('\n')) {
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

const FRAGILE =
  /clinique\.com|smashbox\.com|nyxcosmetics\.com|dior\.com|benefitcosmetics\.com|purpicks\.com|imancosmetics\.com|glossier\.com|fentybeauty\.com|rackcdn\.com/i

const SAFE = /cloudfront\.net|cdn\.dummyjson\.com|fakestoreapi\.com|imgur\.com|unsplash\.com|shopify\.com|escuelajs\.co/i

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
  const makeup = (await (
    await fetch('https://makeup-api.herokuapp.com/api/v1/products.json')
  ).json()) as any[]

  const byName = new Map<string, string>()
  const cloudfrontPool: string[] = []
  for (const p of makeup || []) {
    const image = String(p.image_link || '').trim()
    if (!image.startsWith('http') || !/cloudfront\.net/i.test(image)) continue
    const brand = String(p.brand || '').trim()
    const base = String(p.name || '').trim()
    if (!base) continue
    const full = (brand ? `${brand} ${base}` : base).toLowerCase()
    byName.set(full, image)
    byName.set(base.toLowerCase(), image)
    cloudfrontPool.push(image)
  }
  console.log('CloudFront makeup images available:', cloudfrontPool.length)

  // All primary images
  const products: { id: string; name: string }[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('status', 'PUBLISHED')
      .range(from, from + 999)
    if (!data?.length) break
    products.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const fragileRows: { id: string; productId: string; url: string; name: string }[] = []
  const usedSafe = new Set<string>()

  for (let i = 0; i < products.length; i += 80) {
    const chunk = products.slice(i, i + 80)
    const { data: imgs } = await supabase
      .from('product_images')
      .select('id, url, productId')
      .in(
        'productId',
        chunk.map((p) => p.id)
      )
      .eq('isPrimary', true)
    for (const img of imgs || []) {
      if (SAFE.test(img.url) && !FRAGILE.test(img.url)) {
        usedSafe.add(img.url)
        continue
      }
      if (FRAGILE.test(img.url)) {
        const name = chunk.find((p) => p.id === img.productId)?.name || ''
        fragileRows.push({ id: img.id, productId: img.productId, url: img.url, name })
      }
    }
  }

  console.log('Fragile primary images to fix:', fragileRows.length)

  let fixed = 0
  let poolIdx = 0
  const shuffled = [...cloudfrontPool].sort(() => Math.random() - 0.5)

  for (const row of fragileRows) {
    let next =
      byName.get(row.name.toLowerCase()) ||
      byName.get(row.name.toLowerCase().replace(/^[a-z0-9]+\s+/i, '')) // strip leading brand duplicate

    if (!next || usedSafe.has(next) || !(await urlOk(next))) {
      next = undefined
      while (poolIdx < shuffled.length) {
        const cand = shuffled[poolIdx++]
        if (usedSafe.has(cand)) continue
        if (!(await urlOk(cand))) continue
        next = cand
        break
      }
    }

    if (!next) {
      console.warn('No replacement for', row.name.slice(0, 50))
      continue
    }

    usedSafe.add(next)
    const { error } = await supabase.from('product_images').update({ url: next }).eq('id', row.id)
    if (error) {
      console.warn('update fail', error.message)
      continue
    }
    fixed++
    if (fixed % 25 === 0) console.log(`  … ${fixed}/${fragileRows.length}`)
  }

  console.log('\nFixed', fixed, 'of', fragileRows.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
