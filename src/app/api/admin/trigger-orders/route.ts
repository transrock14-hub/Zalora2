import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

/**
 * POST: Admin triggers an order for a product to a shop (simulates a buyer placing an order).
 * Seller receives the order in Store Orders and a notification.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { productId } = body
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        price,
        shopId,
        shop:shops!products_shopId_fkey (
          id,
          userId
        ),
        images:product_images (
          url
        )
      `)
      .eq('id', productId)
      .not('shopId', 'is', null)
      .single()

    if (productErr || !product) {
      return NextResponse.json({ error: 'Product not found or not a shop product' }, { status: 404 })
    }

    const shopId = (product as any).shopId
    const shop = (product as any).shop
    if (!shopId || !shop?.userId) {
      return NextResponse.json({ error: 'Shop not found for product' }, { status: 400 })
    }

    const sellerUserId = shop.userId
    const price = Number((product as any).price)
    const name = (product as any).name
    const images = (product as any).images as Array<{ url: string }> | undefined
    const imageUrl = images && images.length > 0 ? images[0].url : null

    const orderNumber = `TRG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const subtotal = price
    const shipping = 0
    const tax = 0
    const discount = 0
    const total = subtotal + shipping + tax - discount

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        userId: auth.userId,
        shopId,
        orderNumber,
        subtotal,
        shipping,
        tax,
        discount,
        total,
        status: 'PAID',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'BANK_TRANSFER',
        notes: JSON.stringify({ triggeredBy: 'admin', adminTrigger: true }),
      })
      .select('id, orderNumber')
      .single()

    if (orderErr || !order) {
      console.error('Trigger order insert error:', orderErr)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    await supabaseAdmin.from('order_items').insert({
      orderId: (order as any).id,
      productId: product.id,
      name,
      price,
      quantity: 1,
      image: imageUrl,
    })

    await createNotification({
      userId: sellerUserId,
      title: 'New order',
      message: `Your shop has a new order: ${(order as any).orderNumber}`,
      type: 'order',
      link: `/seller/orders/${(order as any).id}`,
    })

    return NextResponse.json({
      success: true,
      orderId: (order as any).id,
      orderNumber: (order as any).orderNumber,
      message: 'Order triggered. Seller notified.',
    })
  } catch (e) {
    console.error('Trigger order error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
