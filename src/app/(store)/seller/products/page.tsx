import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SellerProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  category?: string
  minPrice?: string
  maxPrice?: string
}

async function getSellerProducts(shopId: string, searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  // Build products query
  let productsQuery = supabaseAdmin
    .from('products')
    .select(`
      *,
      category:categories!products_categoryId_fkey (
        name
      ),
      images:product_images!inner (
        url
      )
    `, { count: 'exact' })
    .eq('shopId', shopId)
    .eq('images.isPrimary', true)

  // Apply filters
  if (searchParams.category) {
    productsQuery = productsQuery.eq('categoryId', searchParams.category)
  }

  if (searchParams.minPrice) {
    productsQuery = productsQuery.gte('price', parseFloat(searchParams.minPrice))
  }
  if (searchParams.maxPrice) {
    productsQuery = productsQuery.lte('price', parseFloat(searchParams.maxPrice))
  }

  // Apply pagination and ordering
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
      slug: p.slug,
      sku: p.sku,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      costPrice: p.costPrice != null ? Number(p.costPrice) : null,
      stock: p.stock,
      status: p.status,
      isFeatured: p.isFeatured,
      categoryName: p.category?.name || 'Uncategorized',
      image: p.images && p.images.length > 0 ? p.images[0].url : null,
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
    categories: (categoriesResult.data || []).map((c: any) => ({ id: c.id, name: c.name })),
  }
}

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await getCurrentUser()

  if (!user) return null

  const { shop } = await getSellerShopAccess(user.id)
  if (!shop) redirect('/seller/create-shop')

  const data = await getSellerProducts(shop.id, searchParams)
  return <SellerProductsClient {...data} searchParams={searchParams} />
}
