import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

const MAX_ORDER_COUNT = 20

/**
 * POST: Admin triggers one or more identical orders for a product (simulates a buyer).
 * `quantity` = how many separate identical orders to create (each with 1 unit).
 * Seller receives each order in Store Orders and a notification.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { productId, customerUserId } = body
    const orderCount = Math.max(1, Math.min(MAX_ORDER_COUNT, Math.floor(Number(body.quantity) || 1)))
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }
    if (!customerUserId || typeof customerUserId !== 'string') {
      return NextResponse.json(
        { error: 'Select a customer to assign this order to' },
        { status: 400 }
      )
    }
    if (!Number.isFinite(orderCount) || orderCount < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    const { data: customer, error: customerErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, status')
      .eq('id', customerUserId)
      .maybeSingle()

    if (customerErr || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    if (customer.status && customer.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Customer account is not active' }, { status: 400 })
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

    const createdOrders: Array<{ id: string; orderNumber: string }> = []

    for (let i = 0; i < orderCount; i++) {
      const orderNumber = `TRG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      const subtotal = price
      const shipping = 0
      const tax = 0
      const discount = 0
      const total = subtotal + shipping + tax - discount

      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
          userId: customer.id,
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
          notes: JSON.stringify({
            triggeredBy: 'admin',
            adminTrigger: true,
            adminUserId: auth.userId,
            customerUserId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email,
            batchCount: orderCount,
            batchIndex: i + 1,
          }),
        })
        .select('id, orderNumber')
        .single()

      if (orderErr || !order) {
        console.error('Trigger order insert error:', orderErr)
        return NextResponse.json(
          {
            error:
              createdOrders.length > 0
                ? `Created ${createdOrders.length} of ${orderCount} orders, then failed`
                : 'Failed to create order',
            orders: createdOrders,
          },
          { status: 500 }
        )
      }

      await supabaseAdmin.from('order_items').insert({
        orderId: (order as any).id,
        productId: product.id,
        name,
        price,
        quantity: 1,
        image: imageUrl,
      })

      createdOrders.push({
        id: (order as any).id,
        orderNumber: (order as any).orderNumber,
      })
    }

    const first = createdOrders[0]
    const orderList =
      orderCount === 1
        ? first.orderNumber
        : createdOrders.map((o) => o.orderNumber).join(', ')

    await createNotification({
      userId: sellerUserId,
      title: orderCount === 1 ? 'New order' : `${orderCount} new orders`,
      message:
        orderCount === 1
          ? `Your shop has a new order: ${first.orderNumber} (1× ${name})`
          : `Your shop has ${orderCount} new orders for ${name}: ${orderList}`,
      type: 'order',
      link: `/seller/orders/${first.id}`,
    })

    return NextResponse.json({
      success: true,
      orderId: first.id,
      orderNumber: first.orderNumber,
      quantity: orderCount,
      orders: createdOrders,
      customer: { id: customer.id, name: customer.name, email: customer.email },
      message:
        orderCount === 1
          ? 'Order triggered. Seller notified.'
          : `${orderCount} identical orders triggered. Seller notified.`,
    })
  } catch (e) {
    console.error('Trigger order error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
