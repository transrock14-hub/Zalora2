import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { mapProductCard, PRODUCT_CARD_COLUMNS } from '@/lib/product-list'
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

  let productsQuery = supabaseAdmin
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
    `,
      { count: 'exact' }
    )
    .eq('status', 'PUBLISHED')
    .eq('images.isPrimary', true)

  // Name/shortDesc only — full description ILIKE is slow at 4k+ products
  if (searchParams.search) {
    const q = searchParams.search.replace(/[%_,]/g, ' ')
    productsQuery = productsQuery.or(`name.ilike.%${q}%,shortDesc.ilike.%${q}%`)
  }

  if (searchParams.category) {
    productsQuery = productsQuery.eq('categoryId', searchParams.category)
  }

  if (searchParams.minPrice) {
    productsQuery = productsQuery.gte('price', parseFloat(searchParams.minPrice))
  }
  if (searchParams.maxPrice) {
    productsQuery = productsQuery.lte('price', parseFloat(searchParams.maxPrice))
  }

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
    products: (productsResult.data || []).map((p: any) =>
      mapProductCard(p, p.images?.[0]?.url, {
        categoryName: p.category?.name || 'Uncategorized',
      })
    ),
    total,
    pages: Math.ceil(total / limit),
    page,
    categories: (categoriesResult.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
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
