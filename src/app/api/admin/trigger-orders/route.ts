import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

const MAX_QUANTITY = 20

/**
 * POST: Admin triggers an order for a product (simulates a buyer).
 * `quantity` = units on that single order (×2 / ×3 / ×5 from admin UI).
 * Seller sees that quantity and pays wholesale × quantity when processing.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getSession()
    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { productId, customerUserId } = body
    const quantity = Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number(body.quantity) || 1)))
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }
    if (!customerUserId || typeof customerUserId !== 'string') {
      return NextResponse.json(
        { error: 'Select a customer to assign this order to' },
        { status: 400 }
      )
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
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

    const orderNumber = `TRG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const subtotal = price * quantity
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
          quantity,
        }),
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
      quantity,
      image: imageUrl,
    })

    await createNotification({
      userId: sellerUserId,
      title: 'New order',
      message: `Your shop has a new order: ${(order as any).orderNumber} (${quantity}× ${name})`,
      type: 'order',
      link: `/seller/orders/${(order as any).id}`,
    })

    return NextResponse.json({
      success: true,
      orderId: (order as any).id,
      orderNumber: (order as any).orderNumber,
      quantity,
      customer: { id: customer.id, name: customer.name, email: customer.email },
      message: 'Order triggered. Seller notified.',
    })
  } catch (e) {
    console.error('Trigger order error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
