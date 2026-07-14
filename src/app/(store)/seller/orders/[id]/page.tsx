import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SellerOrderDetailsClient } from './order-details-client'

async function getOrder(orderId: string, userId: string) {
  // Get user's shop (Supabase can return shops as array or single object)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('shops (*)')
    .eq('id', userId)
    .single()

  const rawShops = user?.shops
  const shop =
    Array.isArray(rawShops) && rawShops.length > 0
      ? rawShops[0]
      : rawShops && typeof rawShops === 'object' && rawShops !== null && 'id' in rawShops
        ? rawShops
        : null

  if (!shop) {
    return null
  }

  // Get order (include notes for shipping address when stored there)
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      user:users!orders_userId_fkey (
        id,
        name,
        email
      ),
      items:order_items (
        *,
        product:products!order_items_productId_fkey (
          name,
          slug,
          shopId
        )
      )
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return null
  }

  // Filter items to only include products from this shop
  const shopItems = (order.items || []).filter((item: any) => item.product?.shopId === shop.id)

  // Verify order has items from this shop
  if (shopItems.length === 0) {
    return null
  }

  // Parse shipping address from notes if present (checkout stores it there)
  let address: {
    name: string
    phone?: string
    address: string
    city: string
    state: string
    zipCode?: string
    postalCode?: string
    country: string
  } | null = null
  try {
    const notes = order.notes
    if (notes && typeof notes === 'string') {
      const parsed = JSON.parse(notes) as { shippingAddress?: typeof address }
      if (parsed?.shippingAddress && typeof parsed.shippingAddress === 'object') {
        const a = parsed.shippingAddress as Record<string, string>
        address = {
          name: a.fullName || a.name || '',
          phone: a.phone,
          address: a.address || '',
          city: a.city || '',
          state: a.state || '',
          zipCode: a.zipCode,
          postalCode: a.postalCode || a.zipCode || '',
          country: a.country || '',
        }
      }
    }
  } catch {
    // ignore
  }

  let isTriggeredOrder = false
  try {
    const notes = order.notes
    if (notes && typeof notes === 'string') {
      const parsed = JSON.parse(notes) as { adminTrigger?: boolean }
      isTriggeredOrder = !!parsed?.adminTrigger
    }
  } catch {
    // ignore
  }

  return {
    ...order,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    address,
    isTriggeredOrder,
    items: shopItems.map((item: any) => ({
      ...item,
      price: Number(item.price),
      product: item.product
        ? {
            name: item.product.name,
            slug: item.product.slug,
          }
        : null,
    })),
  }
}

export default async function SellerOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser) return null

  if (!currentUser.canSell) {
    redirect('/account')
  }

  const { id } = await params
  const order = await getOrder(id, currentUser.id)

  if (!order) {
    redirect('/seller/orders')
  }

  return <SellerOrderDetailsClient order={order} />
}
