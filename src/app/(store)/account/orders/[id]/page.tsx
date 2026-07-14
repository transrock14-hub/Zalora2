import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { OrderDetailsClient } from './order-details-client'

async function getOrder(orderId: string, userId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      items:order_items (
        *,
        product:products!order_items_productId_fkey (
          id,
          name,
          slug,
          images:product_images!inner (
            url
          )
        )
      )
    `)
    .eq('id', orderId)
    .eq('userId', userId)
    .single()

  if (error || !order) {
    return null
  }

  return {
    ...order,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    shippingCost: Number(order.shipping),
    shippingAddress: order.notes || '{}',
    items: (order.items || []).map((item: any) => ({
      ...item,
      price: Number(item.price),
      quantity: item.quantity,
      product: item.product ? {
        ...item.product,
        images: item.product.images || [],
      } : null,
    })),
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()

  if (!user) return null

  const order = await getOrder(params.id, user.id)

  if (!order) {
    notFound()
  }

  return <OrderDetailsClient order={order} />
}
