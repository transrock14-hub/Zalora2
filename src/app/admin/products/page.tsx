import { supabaseAdmin } from '@/lib/supabase'
import { ProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  search?: string
  category?: string
  status?: string
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
      category:categories!products_categoryId_fkey (
        name
      ),
      shop:shops!products_shopId_fkey (
        name
      ),
      images:product_images (
        url,
        isPrimary,
        sortOrder
      )
    `, { count: 'exact' })

  // Apply filters
  if (searchParams.search) {
    productsQuery = productsQuery.or(`name.ilike.%${searchParams.search}%,sku.ilike.%${searchParams.search}%`)
  }

  if (searchParams.category) {
    productsQuery = productsQuery.eq('categoryId', searchParams.category)
  }

  if (searchParams.status) {
    productsQuery = productsQuery.eq('status', searchParams.status)
  }

  // Apply pagination and ordering (primary image is resolved in JS so imageless products still show)
  productsQuery = productsQuery
    .order('createdAt', { ascending: false })
    .range(skip, skip + limit - 1)

  const [productsResult, categoriesResult] = await Promise.all([
    productsQuery,
    supabaseAdmin
      .from('categories')
      .select('id, name')
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
      sku: p.sku,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      stock: p.stock,
      status: p.status,
      isFeatured: p.isFeatured,
      categoryName: p.category?.name || 'Uncategorized',
      shopName: p.shop?.name || null,
      image: (() => {
        const imgs = Array.isArray(p.images) ? p.images : []
        const primary =
          imgs.find((im: any) => im.isPrimary) ||
          [...imgs].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]
        return primary?.url ?? null
      })(),
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
    categories: (categoriesResult.data || []).map((c: any) => ({ id: c.id, name: c.name })),
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const data = await getProducts(searchParams)
  return <ProductsClient {...data} searchParams={searchParams} />
}
