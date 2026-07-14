import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { OrdersClient } from './orders-client'

async function getUserOrders(userId: string) {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      items:order_items (
        *,
        product:products!order_items_productId_fkey (
          name,
          slug,
          images:product_images!inner (
            url
          )
        )
      )
    `)
    .eq('userId', userId)
    .order('createdAt', { ascending: false })

  if (error) {
    throw error
  }

  return (orders || []).map((order: any) => ({
    ...order,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    shippingCost: Number(order.shipping),
    items: (order.items || []).map((item: any) => ({
      ...item,
      price: Number(item.price),
      quantity: item.quantity,
      product: item.product ? {
        ...item.product,
        images: item.product.images || [],
      } : null,
    })),
  }))
}

export default async function OrdersPage() {
  const user = await getCurrentUser()

  if (!user) return null

  const orders = await getUserOrders(user.id)

  return <OrdersClient orders={orders} />
}
