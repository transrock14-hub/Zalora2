import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { DealsClient } from './deals-client'

// Avoid prerender-time DB access on deploy/build environments.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Deals & Sales - ZALORA',
  description: 'Best deals and discounts on fashion products',
}

async function getDeals() {
  // Get products with discounts (comparePrice > price)
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      images:product_images!inner (
        url
      ),
      category:categories!products_categoryId_fkey (
        name
      )
    `)
    .eq('status', 'PUBLISHED')
    .not('comparePrice', 'is', null)
    .eq('images.isPrimary', true)
    .order('createdAt', { ascending: false })
    .limit(50)

  if (error) {
    throw error
  }

  return (products || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    rating: Number(p.rating || 0),
    reviews: p.totalReviews || 0,
    image: p.images && p.images.length > 0 ? p.images[0].url : '/placeholder-product.jpg',
    categoryName: p.category?.name || 'Uncategorized',
    isFeatured: p.isFeatured,
  }))
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
