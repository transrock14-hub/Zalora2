import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { WholesaleClient } from './wholesale-client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  category?: string
  minPrice?: string
  maxPrice?: string
  search?: string
}

async function getWholesaleData(userId: string, searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 24
  const skip = (page - 1) * limit

  // Get user's shop (for listed check)
  const { data: shopRow } = await supabaseAdmin
    .from('shops')
    .select('id')
    .eq('userId', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  // Build query: only admin catalog products available for wholesale (shopId null, wholesalePrice set)
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
    .is('shopId', null)
    .not('wholesalePrice', 'is', null)
    .eq('images.isPrimary', true)

  // Category filter
  if (searchParams.category && searchParams.category !== 'all') {
    productsQuery = productsQuery.eq('categoryId', searchParams.category)
  }

  // Price filter (by wholesale price)
  if (searchParams.minPrice) {
    productsQuery = productsQuery.gte('wholesalePrice', parseFloat(searchParams.minPrice))
  }
  if (searchParams.maxPrice) {
    productsQuery = productsQuery.lte('wholesalePrice', parseFloat(searchParams.maxPrice))
  }

  // Search filter
  if (searchParams.search) {
    productsQuery = productsQuery.or(`name.ilike.%${searchParams.search}%,description.ilike.%${searchParams.search}%`)
  }

  // Apply pagination and ordering
  productsQuery = productsQuery.order('createdAt', { ascending: false }).range(skip, skip + limit - 1)

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
  const catalogProducts = productsResult.data || []
  const catalogIds = catalogProducts.map((p: any) => p.id)

  // Which catalog products has this seller already listed? (product exists with sourceProductId = catalog id, shopId = shop)
  let listedCatalogIds: string[] = []
  if (shopRow?.id && catalogIds.length > 0) {
    const { data: listed } = await supabaseAdmin
      .from('products')
      .select('sourceProductId')
      .eq('shopId', shopRow.id)
      .in('sourceProductId', catalogIds)
    listedCatalogIds = (listed || []).map((r: any) => r.sourceProductId).filter(Boolean)
  }

  return {
    listedCatalogIds,
    products: catalogProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      wholesalePrice: p.wholesalePrice != null ? Number(p.wholesalePrice) : null,
      salePrice: p.salePrice != null ? Number(p.salePrice) : Number(p.price),
      rating: Number(p.rating || 0),
      reviews: p.totalReviews || 0,
      image: p.images && p.images.length > 0 ? p.images[0].url : '/placeholder-product.jpg',
      categoryId: p.categoryId,
      categoryName: p.category?.name || 'Uncategorized',
      isFeatured: p.isFeatured,
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
    categories: (categoriesResult.data || []).map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })),
  }
}

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await getCurrentUser()

  if (!user) return null

  const data = await getWholesaleData(user.id, searchParams)
  return <WholesaleClient {...data} user={user} searchParams={searchParams} />
}
