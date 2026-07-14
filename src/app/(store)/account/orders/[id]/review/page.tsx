import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { ReviewClient } from './review-client'

async function getOrderForReview(orderId: string, userId: string) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, orderNumber, status,
      items:order_items (
        id, productId,
        product:products!order_items_productId_fkey (
          id, name, slug,
          images:product_images ( url, isPrimary )
        )
      )
    `)
    .eq('id', orderId)
    .eq('userId', userId)
    .single()

  if (error || !order) return null
  return order
}

export default async function OrderReviewPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const order = await getOrderForReview(params.id, user.id)
  if (!order) notFound()

  if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
    redirect(`/account/orders/${params.id}`)
  }

  // De-duplicate products (an order can contain the same product multiple times).
  const productMap = new Map<string, { id: string; name: string; slug: string; image: string }>()
  for (const item of (order.items as any[]) || []) {
    const p = item.product
    if (!p || productMap.has(p.id)) continue
    const primary = (p.images || []).find((img: any) => img.isPrimary) || (p.images || [])[0]
    productMap.set(p.id, {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: primary?.url || '/placeholder.png',
    })
  }
  const products = Array.from(productMap.values())

  // Existing reviews for these products by this user (to prefill).
  const productIds = products.map((p) => p.id)
  const { data: existing } = productIds.length
    ? await supabaseAdmin
        .from('reviews')
        .select('productId, rating, title, comment')
        .eq('userId', user.id)
        .in('productId', productIds)
    : { data: [] as any[] }

  const existingMap: Record<string, { rating: number; title: string | null; comment: string | null }> = {}
  for (const r of existing || []) {
    existingMap[r.productId] = { rating: r.rating, title: r.title, comment: r.comment }
  }

  return (
    <ReviewClient
      orderId={order.id}
      orderNumber={order.orderNumber}
      products={products}
      existing={existingMap}
    />
  )
}
