import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ShopDetailsClient } from './shop-client'

export const dynamic = 'force-dynamic'

async function getShopStats(shopId: string, shop: { followers?: number; totalSales?: number }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get product IDs for this shop
  const { data: shopProducts } = await supabaseAdmin
    .from('products')
    .select('id, costPrice')
    .eq('shopId', shopId)

  const productIds = (shopProducts || []).map((p: any) => p.id)
  const productCostMap = new Map((shopProducts || []).map((p: any) => [p.id, Number(p.costPrice || 0)]))

  if (productIds.length === 0) {
    return {
      todayOrders: 0,
      cumulativeOrders: 0,
      todaySales: 0,
      totalSales: 0,
      todayProfit: 0,
      totalProfit: 0,
      followersCount: shop.followers || 0,
      creditScore: 0,
    }
  }

  // Fetch order rows for this shop (with settlement markers when available)
  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select(`
      orderId,
      productId,
      price,
      quantity,
      order:orders!order_items_orderId_fkey (
        createdAt,
        deliveredAt,
        status,
        wholesaleChargedAt,
        salesPaidOutAt,
        settlementRefundedAt
      )
    `)
    .in('productId', productIds)

  if (!orderItems || orderItems.length === 0) {
    return {
      todayOrders: 0,
      cumulativeOrders: 0,
      todaySales: 0,
      totalSales: 0,
      todayProfit: 0,
      totalProfit: 0,
      followersCount: shop.followers || 0,
      creditScore: 0,
    }
  }

  // Group by order
  const ordersMap = new Map()
  orderItems.forEach((item: any) => {
    const orderId = item.orderId
    if (!ordersMap.has(orderId)) {
      ordersMap.set(orderId, {
        createdAt: item.order?.createdAt,
        deliveredAt: item.order?.deliveredAt,
        status: item.order?.status,
        wholesaleChargedAt: item.order?.wholesaleChargedAt,
        salesPaidOutAt: item.order?.salesPaidOutAt,
        settlementRefundedAt: item.order?.settlementRefundedAt,
        items: [],
      })
    }
    ordersMap.get(orderId).items.push({
      productId: item.productId,
      price: Number(item.price),
      quantity: item.quantity,
    })
  })

  const allOrders = Array.from(ordersMap.values())

  const orderWholesale = (order: any) =>
    order.items.reduce((itemSum: number, item: any) => {
      const costPrice = productCostMap.get(item.productId) || 0
      return itemSum + costPrice * item.quantity
    }, 0)

  const orderProfit = (order: any) =>
    order.items.reduce((itemSum: number, item: any) => {
      const costPrice = productCostMap.get(item.productId) || 0
      return itemSum + (item.price - costPrice) * item.quantity
    }, 0)

  const isInToday = (iso: string | null | undefined) => {
    if (!iso) return false
    const d = new Date(iso)
    return d >= today && d < tomorrow
  }

  // Calculate today's orders (created today)
  const todayOrders = allOrders.filter((order: any) => isInToday(order.createdAt))

  // Wholesale was used when shipping/processing. Refunded still counts as
  // order cost once the seller had processed the order (or it was refunded after).
  const wasCharged = (order: any) =>
    !!order.wholesaleChargedAt ||
    ['SHIPPED', 'DELIVERED', 'COMPLETED', 'REFUNDED'].includes(order.status)

  // Profit is realized only when Delivered/Completed (sales lump sum credited)
  // and not reversed by a later refund.
  const wasPaidOut = (order: any) => {
    if (order.settlementRefundedAt || ['REFUNDED', 'CANCELLED'].includes(order.status)) {
      return false
    }
    return (
      !!order.salesPaidOutAt || ['DELIVERED', 'COMPLETED'].includes(order.status)
    )
  }

  const todayProcessed = todayOrders.filter(wasCharged)
  const todaySales = todayProcessed.reduce((sum: number, order: any) => sum + orderWholesale(order), 0)

  const todayDelivered = allOrders.filter(
    (order: any) =>
      wasPaidOut(order) && isInToday(order.deliveredAt || order.salesPaidOutAt || order.createdAt)
  )
  const todayProfit = todayDelivered.reduce((sum: number, order: any) => sum + orderProfit(order), 0)

  const allProcessed = allOrders.filter(wasCharged)
  const totalSales = allProcessed.reduce((sum: number, order: any) => sum + orderWholesale(order), 0)

  const allDelivered = allOrders.filter(wasPaidOut)
  const totalProfit = allDelivered.reduce((sum: number, order: any) => sum + orderProfit(order), 0)

  // Get followers count
  const followersCount = shop.followers || 0

  // Calculate credit score
  const completedOrders = allOrders.filter((o: any) =>
    ['DELIVERED', 'COMPLETED'].includes(o.status)
  ).length
  const orderCompletionRate = allOrders.length > 0 ? (completedOrders / allOrders.length) * 100 : 0
  const creditScore = Math.min(100, Math.round(orderCompletionRate + (allOrders.length > 0 ? 20 : 0)))

  return {
    todayOrders: todayOrders.length,
    cumulativeOrders: allOrders.length,
    todaySales,
    totalSales,
    todayProfit,
    totalProfit,
    followersCount,
    creditScore,
  }
}

export default async function ShopDetailsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) return null

  if (!currentUser.canSell) {
    redirect('/account')
  }

  const { shop: shopFromAccess, canAccessShop } = await getSellerShopAccess(currentUser.id)

  if (!shopFromAccess) {
    redirect('/seller/create-shop')
  }

  if (!canAccessShop) {
    redirect('/seller/verification-status')
  }

  // Use the shop we already have from getSellerShopAccess (avoids excluding shops with 0 products)
  const shop = shopFromAccess
  const stats = await getShopStats(shop.id, { followers: (shop as { followers?: number }).followers, totalSales: (shop as { totalSales?: number }).totalSales })

  // Get product count
  const { count: productCount } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('shopId', shop.id)

  // Convert Decimal fields to numbers and ensure required fields exist (prevent shop details crash)
  const shopRow = shop as { description?: string | null; logo?: string | null; banner?: string | null; balance?: number; rating?: number; commissionRate?: number; followers?: number; totalSales?: number; level?: string }
  const shopData = {
    ...shop,
    description: shopRow.description ?? null,
    logo: shopRow.logo ?? null,
    banner: shopRow.banner ?? null,
    balance: Number(shop.balance ?? 0),
    rating: Number(shop.rating ?? 0),
    commissionRate: Number(shop.commissionRate ?? 0),
    followers: shop.followers ?? 0,
    totalSales: shop.totalSales ?? 0,
    level: shop.level ?? 'BRONZE',
    _count: {
      products: productCount ?? 0,
    },
  }

  return <ShopDetailsClient shop={shopData} stats={stats} userBalance={Number(currentUser.balance ?? 0)} />
}
