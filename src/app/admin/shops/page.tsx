import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { ShopsClient } from './shops-client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  search?: string
  status?: string
}

async function getShops(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  // Build query
  let shopsQuery = supabaseAdmin
    .from('shops')
    .select(`
      *,
      user:users!shops_userId_fkey (
        id,
        name,
        email,
        balance
      )
    `, { count: 'exact' })

  // Apply filters
  if (searchParams.search) {
    shopsQuery = shopsQuery.or(`name.ilike.%${searchParams.search}%,slug.ilike.%${searchParams.search}%`)
  }

  if (searchParams.status && searchParams.status !== 'all') {
    shopsQuery = shopsQuery.eq('status', searchParams.status)
  }

  // Apply pagination and ordering
  shopsQuery = shopsQuery
    .order('createdAt', { ascending: false })
    .range(skip, skip + limit - 1)

  const { data: shops, count: total, error } = await shopsQuery

  if (error) {
    throw error
  }

  // Get counts for each shop
  const shopsWithCounts = await Promise.all(
    (shops || []).map(async (shop: any) => {
      const [productsCount, ordersCount] = await Promise.all([
        supabaseAdmin
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('shopId', shop.id),
        supabaseAdmin
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('shopId', shop.id),
      ])

      // Handle user relationship (can be object or array)
      const userData = shop.user
      const user = Array.isArray(userData) 
        ? (userData.length > 0 ? userData[0] : null)
        : userData

      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        status: shop.status,
        level: shop.level,
        balance: Number(user?.balance ?? shop.balance ?? 0),
        rating: Number(shop.rating || 0),
        totalSales: shop.totalSales || 0,
        commissionRate: Number(shop.commissionRate || 10),
        logo: shop.logo,
        followers: shop.followers || 0,
        createdAt: shop.createdAt,
        user: user || { id: 'unknown', name: 'Unknown', email: 'unknown@example.com' },
        productCount: productsCount.count || 0,
        orderCount: ordersCount.count || 0,
      }
    })
  )

  return {
    shops: shopsWithCounts,
    total: total || 0,
    pages: Math.ceil((total || 0) / limit),
    page,
  }
}

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await getCurrentUser()

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    redirect('/')
  }

  const data = await getShops(searchParams)
  return <ShopsClient {...data} searchParams={searchParams} />
}
