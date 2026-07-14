import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { ProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'All Products - ZALORA',
  description: 'Browse our complete product catalog',
}

interface SearchParams {
  page?: string
  search?: string
  category?: string
  sort?: string
  minPrice?: string
  maxPrice?: string
}

async function getProducts(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  // Build query
  let productsQuery = supabaseAdmin
    .from('products')
    .select(`
      *,
      images:product_images!inner (
        url
      ),
      category:categories!products_categoryId_fkey (
        name
      )
    `, { count: 'exact' })
    .eq('status', 'PUBLISHED')
    .eq('images.isPrimary', true)

  // Search filter
  if (searchParams.search) {
    productsQuery = productsQuery.or(`name.ilike.%${searchParams.search}%,description.ilike.%${searchParams.search}%`)
  }

  // Category filter
  if (searchParams.category) {
    productsQuery = productsQuery.eq('categoryId', searchParams.category)
  }

  // Price filter
  if (searchParams.minPrice) {
    productsQuery = productsQuery.gte('price', parseFloat(searchParams.minPrice))
  }
  if (searchParams.maxPrice) {
    productsQuery = productsQuery.lte('price', parseFloat(searchParams.maxPrice))
  }

  // Sort options
  let orderByColumn = 'createdAt'
  let orderByAscending = false

  if (searchParams.sort === 'price-asc') {
    orderByColumn = 'price'
    orderByAscending = true
  } else if (searchParams.sort === 'price-desc') {
    orderByColumn = 'price'
    orderByAscending = false
  } else if (searchParams.sort === 'popular') {
    orderByColumn = 'totalReviews'
    orderByAscending = false
  } else if (searchParams.sort === 'rating') {
    orderByColumn = 'rating'
    orderByAscending = false
  }

  // Apply ordering and pagination
  productsQuery = productsQuery
    .order(orderByColumn, { ascending: orderByAscending })
    .range(skip, skip + limit - 1)

  const [productsResult, categoriesResult] = await Promise.all([
    productsQuery,
    supabaseAdmin
      .from('categories')
      .select('id, name, slug')
      .eq('isActive', true)
      .order('name', { ascending: true }),
  ])

  if (productsResult.error) {
    throw productsResult.error
  }

  const total = productsResult.count || 0

  return {
    products: (productsResult.data || []).map((p: any) => ({
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
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
    categories: (categoriesResult.data || []).map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })),
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsPageContent searchParams={searchParams} />
    </Suspense>
  )
}

async function ProductsPageContent({ searchParams }: { searchParams: SearchParams }) {
  const data = await getProducts(searchParams)
  return <ProductsClient {...data} searchParams={searchParams} />
}
