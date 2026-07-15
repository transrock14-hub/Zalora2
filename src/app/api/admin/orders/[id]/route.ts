import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'
import { chargeWholesaleForOrder, settleDeliveryForOrder, refundSettlementForOrder, WholesaleSettlementError } from '@/lib/wholesale-settlement'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        user:users!orders_userId_fkey (
          id,
          name,
          email,
          phone
        ),
        address:addresses (*),
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
      .eq('id', params.id)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      )
    }

    // Format product images
    const formattedOrder = {
      ...order,
      items: (order.items || []).map((item: any) => ({
        ...item,
        product: item.product ? {
          ...item.product,
          images: item.product.images || [],
        } : null,
      })),
    }

    return NextResponse.json({ order: formattedOrder })
  } catch (error) {
    console.error('Fetch order error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status, paymentStatus, trackingNumber, adminNotes, shippedAt, deliveredAt } = body

    const updateData: any = {}

    if (status) {
      updateData.status = status
      // Auto-set timestamps based on status
      if (status === 'SHIPPED' && !shippedAt) {
        updateData.shippedAt = new Date().toISOString()
      }
      if (status === 'DELIVERED' && !deliveredAt) {
        updateData.deliveredAt = new Date().toISOString()
      }
      if (status === 'COMPLETED' && !deliveredAt && !body.deliveredAt) {
        // Completion realizes the sales payout — treat like delivered for timestamps
        updateData.deliveredAt = new Date().toISOString()
      }
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus
      if (paymentStatus === 'COMPLETED' && !body.paidAt) {
        updateData.paidAt = new Date().toISOString()
      }
    }

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || null
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes || null
    }

    if (shippedAt) {
      updateData.shippedAt = new Date(shippedAt).toISOString()
    }

    if (deliveredAt) {
      updateData.deliveredAt = new Date(deliveredAt).toISOString()
    }

    // Get order before update to check for status changes and shopId
    const { data: oldOrder, error: oldOrderError } = await supabaseAdmin
      .from('orders')
      .select(`
        userId,
        shopId,
        status,
        paymentStatus,
        orderNumber,
        total,
        items:order_items (
          product:products!order_items_productId_fkey (
            shopId
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (oldOrderError || !oldOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const PAID_STATES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']
    const DELIVERED_STATES = ['DELIVERED', 'COMPLETED']
    const wasPaid =
      oldOrder.paymentStatus === 'COMPLETED' || PAID_STATES.includes(oldOrder.status ?? '')
    const nowPaid =
      paymentStatus === 'COMPLETED' ||
      (status ? PAID_STATES.includes(status) : PAID_STATES.includes(oldOrder.status ?? ''))
    const wasDelivered = DELIVERED_STATES.includes(oldOrder.status ?? '')
    const nowDelivered = !!status && DELIVERED_STATES.includes(status)
    const wasRefunded = oldOrder.status === 'REFUNDED' || oldOrder.status === 'CANCELLED'
    const nowRefunded = !!status && (status === 'REFUNDED' || status === 'CANCELLED')

    // Block SHIPPED if seller cannot cover wholesale (same rule as seller ship).
    if (
      status === 'SHIPPED' &&
      !['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(oldOrder.status ?? '')
    ) {
      try {
        await chargeWholesaleForOrder(params.id, { strict: true })
      } catch (e) {
        if (e instanceof WholesaleSettlementError) {
          return NextResponse.json({ error: e.message, code: e.code }, { status: 400 })
        }
        throw e
      }
    }

    // Delivered/Completed: deduct wholesale (if needed) then credit sales lump sum
    // BEFORE updating status, so a failed settlement does not leave a false "completed" order.
    if (nowDelivered && !wasDelivered) {
      try {
        await settleDeliveryForOrder(params.id, { strict: true })
      } catch (e) {
        if (e instanceof WholesaleSettlementError) {
          return NextResponse.json({ error: e.message, code: e.code }, { status: 400 })
        }
        throw e
      }
    }

    // Update order
    const { data: order, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
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
            slug
          )
        )
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    // Reseller money flow: charge wholesale when the order first becomes paid
    // (if not already charged on ship). Soft-fail so payment approval still works.
    if (nowPaid && !wasPaid) {
      await chargeWholesaleForOrder(params.id, { strict: false })
    }
    // On refund/cancel: credit wholesale back (and claw back sales payout if paid).
    if (nowRefunded && !wasRefunded) {
      await refundSettlementForOrder(params.id)
    }

    // When order is DELIVERED or COMPLETED, clear sourceProductId so seller can re-list those products
    if (status === 'DELIVERED' || status === 'COMPLETED') {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('productId')
        .eq('orderId', params.id)
      const productIds = Array.from(new Set((items || []).map((i: any) => i.productId)))
      if (productIds.length > 0) {
        await supabaseAdmin
          .from('products')
          .update({ sourceProductId: null })
          .in('id', productIds)
      }
    }

    // Create notifications for status changes
    try {
      if (status && status !== oldOrder.status) {
        let notificationTitle = ''
        let notificationMessage = ''
        let notificationType: 'order' | 'payment' | 'promo' | 'system' | 'support' = 'order'

        switch (status) {
          case 'SHIPPED':
            notificationTitle = 'Order Shipped'
            notificationMessage = `Your order ${order.orderNumber} has been shipped${order.trackingNumber ? ` with tracking number ${order.trackingNumber}` : ''}`
            break
          case 'DELIVERED':
            notificationTitle = 'Order Delivered'
            notificationMessage = `Your order ${order.orderNumber} has been delivered`
            break
          case 'CANCELLED':
            notificationTitle = 'Order Cancelled'
            notificationMessage = `Your order ${order.orderNumber} has been cancelled`
            break
          case 'REFUNDED':
            notificationTitle = 'Order Refunded'
            notificationMessage = `Your order ${order.orderNumber} has been refunded`
            break
          case 'PAID':
            notificationTitle = 'Payment Received'
            notificationMessage = `Payment for order ${order.orderNumber} has been received`
            notificationType = 'payment'
            break
          case 'COMPLETED':
            notificationTitle = 'Order Completed'
            notificationMessage = `Your order ${order.orderNumber} has been completed`
            break
        }

        // Notify customer
        if (notificationTitle) {
          await createNotification({
            userId: order.user.id,
            title: notificationTitle,
            message: notificationMessage,
            type: notificationType,
            link: `/account/orders/${order.id}`,
          })
        }

        // Notify sellers (shop owners) when admin changes order status
        if (oldOrder.items && Array.isArray(oldOrder.items)) {
          const shopIds = new Set<string>()
          for (const item of oldOrder.items) {
            const product = item.product as any
            if (product?.shopId) {
              shopIds.add(product.shopId)
            }
          }

          if (shopIds.size > 0) {
            const { data: shops } = await supabaseAdmin
              .from('shops')
              .select('id, userId')
              .in('id', Array.from(shopIds))

            const sellerIds = new Set<string>()
            for (const shop of shops || []) {
              if (shop.userId) {
                sellerIds.add(shop.userId)
              }
            }

            // Create seller notification message
            let sellerNotificationTitle = ''
            let sellerNotificationMessage = ''

            switch (status) {
              case 'DELIVERED':
                sellerNotificationTitle = 'Order Delivered'
                sellerNotificationMessage = `Order ${order.orderNumber} has been marked as DELIVERED by admin`
                break
              case 'COMPLETED':
                sellerNotificationTitle = 'Order Completed'
                sellerNotificationMessage = `Order ${order.orderNumber} has been marked as COMPLETED by admin`
                break
              case 'CANCELLED':
                sellerNotificationTitle = 'Order Cancelled'
                sellerNotificationMessage = `Order ${order.orderNumber} has been cancelled by admin`
                break
              case 'REFUNDED':
                sellerNotificationTitle = 'Order Refunded'
                sellerNotificationMessage = `Order ${order.orderNumber} has been refunded by admin`
                break
            }

            // Send notifications to all sellers with products in this order
            if (sellerNotificationTitle && sellerIds.size > 0) {
              for (const sellerId of Array.from(sellerIds)) {
                try {
                  await createNotification({
                    userId: sellerId,
                    title: sellerNotificationTitle,
                    message: sellerNotificationMessage,
                    type: 'order',
                    link: `/seller/orders/${order.id}`,
                  })
                } catch (notifError) {
                  console.error(`Failed to notify seller ${sellerId}:`, notifError)
                }
              }
            }
          }
        }
      }

      if (paymentStatus && paymentStatus !== oldOrder.paymentStatus) {
        if (paymentStatus === 'COMPLETED') {
          await createNotification({
            userId: order.user.id,
            title: 'Payment Confirmed',
            message: `Payment for order ${order.orderNumber} has been confirmed`,
            type: 'payment',
            link: `/account/orders/${order.id}`,
          })
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      // Don't fail the request if notification creation fails
    }

    return NextResponse.json({
      message: 'Order updated successfully',
      order,
    })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { message: 'Failed to update order' },
      { status: 500 }
    )
  }
}
