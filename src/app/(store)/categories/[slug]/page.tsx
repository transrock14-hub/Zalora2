import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { CategoryProductsClient } from './category-products-client'

export const dynamic = 'force-dynamic'

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

async function getCategoryData(slug: string, searchParams: SearchParams) {
  const slugDecoded = decodeURIComponent(slug || '').trim()
  if (!slugDecoded) return null

  // Do NOT embed children via PostgREST self-FK hint — live DB has parentId
  // column but no `categories_parentId_fkey` in the schema cache, which made
  // /categories/[slug] return 404 (blank page). Fetch children separately.

  // Try exact match first
  let result = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('slug', slugDecoded)
    .maybeSingle()

  // Try normalized slug (lowercase, spaces to hyphens) if no exact match
  if (!result.data && slugDecoded) {
    const normalized = normalizeSlug(slugDecoded) || slugDecoded
    if (normalized !== slugDecoded) {
      result = await supabaseAdmin
        .from('categories')
        .select('*')
        .eq('slug', normalized)
        .maybeSingle()
    }
  }

  // Try case-insensitive match
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
        .select('*')
        .eq('id', match.id)
        .single()
      if (byId.data) result = byId
    }
  }

  const category = result.data
  if (!category) {
    return null
  }

  const { data: childRows } = await supabaseAdmin
    .from('categories')
    .select('id, name, slug, isActive')
    .eq('parentId', category.id)
    .eq('isActive', true)
    .order('sortOrder', { ascending: true })

  const activeChildren = childRows || []

  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  // Build order by
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

  // Robust fetch that mirrors /api/store/products (which works on the live
  // runtime). The live server returns empty for `!inner` embedded joins and
  // for `count: 'exact'`/head-count requests, so we use plain row selects and
  // fetch primary images separately.
  const { data: productRows, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, price, comparePrice, rating, totalReviews, isFeatured, createdAt')
    .eq('categoryId', category.id)
    .eq('status', 'PUBLISHED')
    .order(orderByColumn, { ascending: orderByAscending })
    .range(skip, skip + limit - 1)

  if (productsError) {
    throw productsError
  }

  // Total via a lightweight id select (exact/head counts are unreliable on live).
  const { data: idRows } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('categoryId', category.id)
    .eq('status', 'PUBLISHED')
    .limit(1000)
  const total = idRows?.length ?? 0

  // Primary image per product for the current page.
  const productIds = (productRows || []).map((p: any) => p.id)
  const imageMap: Record<string, string> = {}
  if (productIds.length > 0) {
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('productId, url, isPrimary')
      .in('productId', productIds)
      .order('isPrimary', { ascending: false })
    for (const img of images || []) {
      if (!imageMap[img.productId]) imageMap[img.productId] = img.url
    }
  }

  return {
    category: {
      ...category,
      children: activeChildren,
    },
    products: (productRows || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      rating: Number(p.rating || 0),
      reviews: p.totalReviews || 0,
      image: imageMap[p.id] || '/placeholder-product.jpg',
      isFeatured: p.isFeatured,
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
  }
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
