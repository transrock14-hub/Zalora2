import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { mapProductCard, PRODUCT_CARD_COLUMNS } from '@/lib/product-list'
import { DealsClient } from './deals-client'

// Supabase client uses cache: 'no-store'; mark route dynamic (not ISR prerender).
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Deals & Sales - ZALORA',
  description: 'Best deals and discounts on fashion products',
}

const getCachedDeals = unstable_cache(
  async () => {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(
        `
      ${PRODUCT_CARD_COLUMNS},
      images:product_images!inner (
        url
      ),
      category:categories!products_categoryId_fkey (
        name
      )
    `
      )
      .eq('status', 'PUBLISHED')
      .not('comparePrice', 'is', null)
      .eq('images.isPrimary', true)
      .order('createdAt', { ascending: false })
      .limit(48)

    if (error) throw error

    return (products || []).map((p: any) =>
      mapProductCard(p, p.images?.[0]?.url, {
        categoryName: p.category?.name || 'Uncategorized',
      })
    )
  },
  ['deals-v1'],
  { revalidate: 60, tags: ['products', 'home'] }
)

async function getDeals() {
  return getCachedDeals()
}

export default async function DealsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DealsPageContent />
    </Suspense>
  )
}

async function DealsPageContent() {
  const products = await getDeals()
  return <DealsClient products={products} />
}
