import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'
import { chargeWholesaleForOrder } from '@/lib/wholesale-settlement'

/**
 * PATCH: Seller updates order status (e.g. mark shipped, completed). Only for orders with items from seller's shop.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await req.json()
    const { status, trackingNumber } = body

    // Sellers can only mark orders as SHIPPED
    if (status && status !== 'SHIPPED') {
      return NextResponse.json(
        { error: 'Sellers can only mark orders as SHIPPED. Other status changes must be done by admin.' },
        { status: 403 }
      )
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('shops (*)')
      .eq('id', session.userId)
      .single()

    const rawShops = user?.shops
    const shop =
      Array.isArray(rawShops) && rawShops.length > 0
        ? rawShops[0]
        : rawShops && typeof rawShops === 'object' && rawShops !== null && 'id' in rawShops
          ? rawShops
          : null

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, userId, status, orderNumber, items:order_items(productId, product:products!order_items_productId_fkey(shopId))')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const shopItems = (order.items || []).filter(
      (item: any) => item.product?.shopId === shop.id
    )
    if (shopItems.length === 0) {
      return NextResponse.json({ error: 'Order has no items from your shop' }, { status: 403 })
    }

    // Only allow marking as SHIPPED if order is not already SHIPPED or beyond
    if (status === 'SHIPPED' && ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      return NextResponse.json(
        { error: `Order is already ${order.status}. Cannot change status.` },
        { status: 400 }
      )
    }

    // When seller processes/ships the order, deduct wholesale from their balance
    // (same charge as PAID — idempotent, will not double-deduct).
    if (status === 'SHIPPED') {
      await chargeWholesaleForOrder(orderId)
    }

    const updateData: Record<string, unknown> = {}
    if (status) {
      updateData.status = status
      if (status === 'SHIPPED' && trackingNumber !== undefined) {
        updateData.trackingNumber = trackingNumber || null
      }
      if (status === 'SHIPPED') {
        updateData.shippedAt = new Date().toISOString()
      }
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date().toISOString()
      }
    }
    if (trackingNumber !== undefined && !updateData.trackingNumber) {
      updateData.trackingNumber = trackingNumber || null
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateErr) throw updateErr

    // Note: sourceProductId clearing happens in admin orders API when status is DELIVERED or COMPLETED

    if (status && order.userId) {
      try {
        let title = 'Order updated'
        let message = `Order ${order.orderNumber} status: ${status}`
        if (status === 'SHIPPED' && trackingNumber) {
          message += ` — Tracking: ${trackingNumber}`
        }
        await createNotification({
          userId: order.userId,
          title,
          message,
          type: 'order',
          link: `/account/orders/${orderId}`,
        })
      } catch (e) {
        console.error('Notification error', e)
      }
    }

    return NextResponse.json({ order: updated })
  } catch (e) {
    console.error('PATCH /api/seller/orders/[id]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update order' },
      { status: 500 }
    )
  }
}
