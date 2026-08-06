import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import {
  countPublishedInCategory,
  fetchPrimaryImageMap,
  mapProductCard,
} from '@/lib/product-list'
import { CategoryProductsClient } from './category-products-client'

export const revalidate = 60

interface SearchParams {
  page?: string
  sort?: string
}

function normalizeSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function resolveCategory(slugDecoded: string) {
  let result = await supabaseAdmin
    .from('categories')
    .select('id, name, slug, description, icon, image, parentId, isActive')
    .eq('slug', slugDecoded)
    .maybeSingle()

  if (!result.data && slugDecoded) {
    const normalized = normalizeSlug(slugDecoded) || slugDecoded
    if (normalized !== slugDecoded) {
      result = await supabaseAdmin
        .from('categories')
        .select('id, name, slug, description, icon, image, parentId, isActive')
        .eq('slug', normalized)
        .maybeSingle()
    }
  }

  if (!result.data) {
    const { data: all } = await supabaseAdmin
      .from('categories')
      .select('id, slug')
      .eq('isActive', true)
    const match = (all || []).find(
      (c: { slug: string }) => c.slug && c.slug.toLowerCase() === slugDecoded.toLowerCase()
    )
    if (match) {
      const byId = await supabaseAdmin
        .from('categories')
        .select('id, name, slug, description, icon, image, parentId, isActive')
        .eq('id', match.id)
        .single()
      if (byId.data) result = byId
    }
  }

  return result.data
}

async function getCategoryDataUncached(slug: string, searchParams: SearchParams) {
  const slugDecoded = decodeURIComponent(slug || '').trim()
  if (!slugDecoded) return null

  const category = await resolveCategory(slugDecoded)
  if (!category) return null

  const page = parseInt(searchParams.page || '1') || 1
  const limit = 20
  const skip = (page - 1) * limit

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

  const [childRowsRes, productRowsRes, total] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('id, name, slug, isActive')
      .eq('parentId', category.id)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true }),
    supabaseAdmin
      .from('products')
      .select('id, name, slug, price, comparePrice, rating, totalReviews, isFeatured, createdAt')
      .eq('categoryId', category.id)
      .eq('status', 'PUBLISHED')
      .order(orderByColumn, { ascending: orderByAscending })
      .range(skip, skip + limit - 1),
    countPublishedInCategory(category.id),
  ])

  if (productRowsRes.error) {
    throw productRowsRes.error
  }

  const productRows = productRowsRes.data || []
  const imageMap = await fetchPrimaryImageMap(productRows.map((p: any) => p.id))

  return {
    category: {
      ...category,
      children: childRowsRes.data || [],
    },
    products: productRows.map((p: any) => mapProductCard(p, imageMap[p.id])),
    total,
    pages: Math.ceil(total / limit),
    page,
  }
}

async function getCategoryData(slug: string, searchParams: SearchParams) {
  const page = searchParams.page || '1'
  const sort = searchParams.sort || 'newest'
  const cached = unstable_cache(
    () => getCategoryDataUncached(slug, searchParams),
    ['category-page', slug, page, sort],
    { revalidate: 60, tags: ['products', 'categories'] }
  )
  return cached()
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: SearchParams
}) {
  const data = await getCategoryData(params.slug, searchParams)

  if (!data) {
    notFound()
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoryProductsClient
        category={data.category}
        products={data.products}
        total={data.total}
        pages={data.pages}
        page={data.page}
        searchParams={searchParams}
      />
    </Suspense>
  )
}
