import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { UserDetailsClient } from './user-details-client'

export const dynamic = 'force-dynamic'

async function getUserData(userId: string) {
  // Get user with shop
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select(`
      *,
      shops (
        *,
        products:products!inner (
          id
        ),
        orders:orders!inner (
          id
        )
      )
    `)
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return null
  }

  const shop = user.shops && Array.isArray(user.shops) && user.shops.length > 0 ? user.shops[0] : null

  // Get counts
  const [ordersCount, addressesCount, reviewsCount, favoritesCount, recentOrdersResult] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('userId', userId),
    supabaseAdmin.from('addresses').select('*', { count: 'exact', head: true }).eq('userId', userId),
    supabaseAdmin.from('reviews').select('*', { count: 'exact', head: true }).eq('userId', userId),
    supabaseAdmin.from('favorites').select('*', { count: 'exact', head: true }).eq('userId', userId),
    supabaseAdmin
      .from('orders')
      .select('id, orderNumber, status, paymentStatus, total, createdAt')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(5),
  ])

  // Get shop counts if shop exists
  let shopProductCount = 0
  let shopOrderCount = 0
  if (shop) {
    const [shopProductsCount, shopOrdersCount] = await Promise.all([
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('shopId', shop.id),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('shopId', shop.id),
    ])
    shopProductCount = shopProductsCount.count || 0
    shopOrderCount = shopOrdersCount.count || 0
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      status: user.status,
      balance: Number(user.balance || 0),
      canSell: user.canSell,
      emailVerified: user.emailVerified || null,
      preferences: user.preferences && typeof user.preferences === 'object' ? user.preferences : {},
      lastLoginAt: user.lastLoginAt || null,
      lastLoginIp: user.lastLoginIp,
      createdAt: user.createdAt,
      orderCount: ordersCount.count || 0,
      addressCount: addressesCount.count || 0,
      reviewCount: reviewsCount.count || 0,
      favoriteCount: favoritesCount.count || 0,
    },
    shop: shop
      ? {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          status: shop.status,
          level: shop.level,
          balance: Number(shop.balance || 0),
          rating: Number(shop.rating || 0),
          productCount: shopProductCount,
          orderCount: shopOrderCount,
        }
      : null,
    recentOrders: (recentOrdersResult.data || []).map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total || 0),
      createdAt: order.createdAt,
    })),
  }
}

export default async function UserDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser) return null

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    redirect('/')
  }

  const data = await getUserData(params.id)

  if (!data) {
    redirect('/admin/users')
  }

  return <UserDetailsClient {...data} />
}
