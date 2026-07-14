import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SellerDashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

async function getSellerStats(userId: string, shopId: string | null) {
  if (!shopId) {
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      activeProducts: 0,
      recentOrders: [],
    }
  }

  // Get product IDs for this shop
  const { data: shopProducts } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('shopId', shopId)

  const productIds = (shopProducts || []).map((p: any) => p.id)

  if (productIds.length === 0) {
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      activeProducts: 0,
      recentOrders: [],
    }
  }

  // Get orders that have items with products from this shop
  const { data: ordersWithShopProducts } = await supabaseAdmin
    .from('order_items')
    .select('orderId')
    .in('productId', productIds)

  const orderIds = Array.from(new Set((ordersWithShopProducts || []).map((item: any) => item.orderId)))

  const [
    totalProductsResult,
    totalOrdersResult,
    revenueOrdersResult,
    pendingOrdersResult,
    activeProductsResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('shopId', shopId),
    orderIds.length > 0
      ? supabaseAdmin
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('id', orderIds)
      : Promise.resolve({ count: 0 }),
    orderIds.length > 0
      ? supabaseAdmin
          .from('orders')
          .select('total')
          .in('id', orderIds)
          .eq('paymentStatus', 'COMPLETED')
      : Promise.resolve({ data: [] }),
    orderIds.length > 0
      ? supabaseAdmin
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('id', orderIds)
          .in('status', ['PENDING_PAYMENT', 'PROCESSING'])
      : Promise.resolve({ count: 0 }),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('shopId', shopId)
      .eq('status', 'PUBLISHED'),
    orderIds.length > 0
      ? supabaseAdmin
          .from('orders')
          .select(`
            id,
            orderNumber,
            total,
            status,
            createdAt,
            user:users!orders_userId_fkey (
              name
            ),
            items:order_items!inner (
              productId
            )
          `)
          .in('id', orderIds)
          .in('items.productId', productIds)
          .order('createdAt', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  // Calculate total revenue
  const totalRevenue = (revenueOrdersResult.data || []).reduce(
    (sum: number, order: any) => sum + Number(order.total || 0),
    0
  )

  // Format recent orders
  const recentOrders = (recentOrdersResult.data || []).map((order: any) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    userName: order.user?.name || 'Unknown',
    total: Number(order.total || 0),
    status: order.status,
    createdAt: order.createdAt,
  }))

  return {
    totalProducts: totalProductsResult.count || 0,
    totalOrders: totalOrdersResult.count || 0,
    totalRevenue,
    pendingOrders: pendingOrdersResult.count || 0,
    activeProducts: activeProductsResult.count || 0,
    recentOrders,
  }
}

export default async function SellerDashboardPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) return null

  const { shop, canAccessShop } = await getSellerShopAccess(currentUser.id)

  if (!shop) {
    redirect('/seller/create-shop')
  }

  const stats = await getSellerStats(currentUser.id, shop?.id || null)

  // Convert Decimal fields to numbers for client component.
  // Shop Balance must match homepage Account Balance (users.balance).
  const userBalance = Number(currentUser.balance || 0)
  const shopData = shop
    ? {
        ...shop,
        balance: userBalance,
        rating: Number(shop.rating || 0),
        commissionRate: Number(shop.commissionRate || 0),
      }
    : null

  return <SellerDashboardClient stats={stats} shop={shopData} />
}
