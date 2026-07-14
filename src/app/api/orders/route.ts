import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification, createNotificationsForUsers } from '@/lib/notifications'
import { getCheckoutSettings, computeOrderTotals, isCryptoCurrencyEnabled } from '@/lib/checkout-settings'
import { validateCouponCode, incrementCouponUsage } from '@/lib/coupons'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { getEmailConfig } from '@/lib/settings'
import { chargeWholesaleForOrder } from '@/lib/wholesale-settlement'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json(
        { message: 'Please login to place an order' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      items,
      address,
      paymentMethod,
      cryptoType,
      cryptoAddressId,
      shopId,
      payWithShopBalance,
      addToStore,
      couponCode,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: 'No items in order' },
        { status: 400 }
      )
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // Fetch authoritative product data (price/stock/status/image). NEVER trust client prices.
    const productIds = Array.from(
      new Set(items.map((item: any) => item.productId).filter(Boolean))
    ) as string[]

    if (productIds.length === 0) {
      return NextResponse.json({ message: 'Invalid items in order' }, { status: 400 })
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        price,
        stock,
        status,
        shopId,
        images:product_images (
          url,
          isPrimary,
          sortOrder
        )
      `)
      .in('id', productIds)

    if (productsError) {
      throw productsError
    }

    const productMap = new Map((products || []).map((p: any) => [p.id, p]))

    // Validate every line item and compute totals from the database, not the client.
    const validatedItems: Array<{
      productId: string
      quantity: number
      price: number
      name: string
      image: string | null
      shopId: string | null
    }> = []
    let subtotal = 0

    for (const item of items) {
      const product = productMap.get(item.productId)
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0))

      if (!product) {
        return NextResponse.json(
          { message: 'One or more products are no longer available' },
          { status: 400 }
        )
      }
      if (product.status === 'DRAFT' || product.status === 'ARCHIVED') {
        return NextResponse.json(
          { message: `"${product.name}" is no longer available` },
          { status: 400 }
        )
      }
      if (typeof product.stock === 'number' && product.stock < quantity) {
        return NextResponse.json(
          { message: `Not enough stock for "${product.name}". Only ${product.stock} left.` },
          { status: 400 }
        )
      }

      const price = Number(product.price)
      subtotal += price * quantity

      const imgs = Array.isArray(product.images) ? product.images : []
      const primary =
        imgs.find((im: any) => im.isPrimary) ||
        [...imgs].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]

      validatedItems.push({
        productId: product.id,
        quantity,
        price,
        name: product.name,
        image: primary?.url ?? null,
        shopId: product.shopId ?? null,
      })
    }

    const checkoutSettings = await getCheckoutSettings()

    let discount = 0
    let couponId: string | null = null
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const couponResult = await validateCouponCode(couponCode, subtotal)
      if (!couponResult.valid) {
        return NextResponse.json({ message: couponResult.error }, { status: 400 })
      }
      discount = couponResult.discount
      couponId = couponResult.coupon.id
    }

    const { shipping: shippingCost, tax, total: totalAmount } = computeOrderTotals(
      subtotal,
      discount,
      checkoutSettings
    )

    // Enforce enabled payment methods from admin settings
    if (paymentMethod === 'crypto') {
      if (!checkoutSettings.cryptoEnabled) {
        return NextResponse.json({ message: 'Cryptocurrency payments are not available' }, { status: 400 })
      }
      if (!cryptoType || !isCryptoCurrencyEnabled(cryptoType, checkoutSettings)) {
        return NextResponse.json({ message: 'This cryptocurrency is not accepted' }, { status: 400 })
      }
      if (!cryptoAddressId) {
        return NextResponse.json({ message: 'Please select a payment wallet' }, { status: 400 })
      }
    }
    if (paymentMethod === 'balance' && !checkoutSettings.balanceEnabled) {
      return NextResponse.json({ message: 'Balance payments are not available' }, { status: 400 })
    }
    if (paymentMethod === 'cod' && !checkoutSettings.codEnabled) {
      return NextResponse.json({ message: 'Cash on delivery is not available' }, { status: 400 })
    }
    if (paymentMethod === 'card' && !checkoutSettings.bankTransferEnabled) {
      return NextResponse.json({ message: 'Bank transfer is not available' }, { status: 400 })
    }

    // Validate balance only (deduct after order is created so we never deduct then fail)
    if (paymentMethod === 'balance') {
      if (payWithShopBalance) {
        const { data: shop } = await supabaseAdmin
          .from('shops')
          .select('id, balance, userId')
          .eq('userId', session.userId)
          .maybeSingle()
        if (!shop || Number(shop.balance) < totalAmount) {
          return NextResponse.json(
            { message: 'Insufficient shop balance' },
            { status: 400 }
          )
        }
      } else {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('id, balance')
          .eq('id', session.userId)
          .single()
        if (!userRow || Number(userRow.balance) < totalAmount) {
          return NextResponse.json(
            { message: 'Insufficient account balance' },
            { status: 400 }
          )
        }
      }
    }

    // Create order — use enum values: PaymentMethod has BANK_TRANSFER, PaymentStatus has COMPLETED, OrderStatus has PAID
    const orderPaymentStatus =
      paymentMethod === 'balance' ? 'COMPLETED' : paymentMethod === 'cod' ? 'PENDING' : 'PENDING'
    const orderPaymentMethod =
      paymentMethod === 'balance'
        ? 'BANK_TRANSFER'
        : paymentMethod === 'card'
          ? 'BANK_TRANSFER'
          : paymentMethod === 'cod'
            ? 'CASH_ON_DELIVERY'
            : cryptoType
    const orderStatus =
      paymentMethod === 'balance' ? 'PAID' : paymentMethod === 'cod' ? 'PENDING_PAYMENT' : 'PENDING_PAYMENT'
    const notesObj: Record<string, unknown> = {
      shippingAddress: address,
      cryptoAddressId: paymentMethod === 'crypto' ? cryptoAddressId : undefined,
    }
    if (paymentMethod === 'balance') {
      notesObj.paymentSource = payWithShopBalance ? 'shop_balance' : 'user_balance'
    }
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        userId: session.userId,
        shopId: shopId || null,
        orderNumber,
        subtotal,
        shipping: shippingCost,
        tax,
        discount,
        total: totalAmount,
        couponId,
        status: orderStatus,
        paymentStatus: orderPaymentStatus,
        paymentMethod: orderPaymentMethod,
        cryptoCurrency: paymentMethod === 'crypto' ? cryptoType : undefined,
        notes: JSON.stringify(notesObj),
      })
      .select()
      .single()

    if (orderError || !order) {
      throw orderError || new Error('Failed to create order')
    }

    // Create order items from validated (server-priced) data
    const orderItems = validatedItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback order if items fail
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    // Decrement stock atomically via RPC (race-safe). Falls back to a
    // best-effort read-modify-write if the RPC isn't installed yet.
    for (const item of validatedItems) {
      const product = productMap.get(item.productId)
      if (!product || typeof product.stock !== 'number') continue

      const { error: rpcErr } = await supabaseAdmin.rpc('decrement_product_stock', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
      })

      if (rpcErr) {
        // Fallback: non-atomic update (used until supabase-stock-function.sql is applied)
        const newStock = Math.max(0, product.stock - item.quantity)
        const { error: stockErr } = await supabaseAdmin
          .from('products')
          .update({
            stock: newStock,
            ...(newStock === 0 ? { status: 'OUT_OF_STOCK' } : {}),
          })
          .eq('id', item.productId)
        if (stockErr) {
          console.error(`Failed to decrement stock for ${item.productId}:`, stockErr)
        }
      }
    }

    // Increment coupon usage after order is persisted
    if (couponId) {
      try {
        await incrementCouponUsage(couponId)
      } catch (e) {
        console.error('Failed to increment coupon usage:', e)
      }
    }

    // Deduct balance only after order + items are created (so we never deduct then fail on order insert)
    if (paymentMethod === 'balance') {
      if (payWithShopBalance) {
        const { data: shop } = await supabaseAdmin
          .from('shops')
          .select('id, balance, userId')
          .eq('userId', session.userId)
          .maybeSingle()
        if (!shop || Number(shop.balance) < totalAmount) {
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return NextResponse.json(
            { message: 'Insufficient shop balance' },
            { status: 400 }
          )
        }
        const { error: updateErr } = await supabaseAdmin
          .from('shops')
          .update({ balance: Number(shop.balance) - totalAmount })
          .eq('id', shop.id)
        if (updateErr) {
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return NextResponse.json(
            { message: 'Failed to deduct shop balance' },
            { status: 500 }
          )
        }
      } else {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('id, balance')
          .eq('id', session.userId)
          .single()
        if (!userRow || Number(userRow.balance) < totalAmount) {
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return NextResponse.json(
            { message: 'Insufficient account balance' },
            { status: 400 }
          )
        }
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({ balance: Number(userRow.balance) - totalAmount })
          .eq('id', session.userId)
        if (updateErr) {
          await supabaseAdmin.from('orders').delete().eq('id', order.id)
          return NextResponse.json(
            { message: 'Failed to deduct account balance' },
            { status: 500 }
          )
        }
      }
    }

    // If the order is created already paid (balance payment), the reseller pays
    // the wholesale price now. Other methods charge when payment is approved.
    if (orderStatus === 'PAID') {
      // Prefer charging at payment; if seller lacks funds, defer until ship (strict block).
      await chargeWholesaleForOrder(order.id, { strict: false })
    }

    // Fetch complete order with items
    const { data: completeOrder } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        items:order_items (*),
        user:users!orders_userId_fkey (
          id
        )
      `)
      .eq('id', order.id)
      .single()

    // Create notification for buyer (order placement)
    try {
      await createNotification({
        userId: session.userId,
        title: 'Order Placed',
        message: `Your order ${order.orderNumber} has been placed successfully`,
        type: 'order',
        link: `/account/orders/${order.id}`,
      })
    } catch (error) {
      console.error('Error creating notification:', error)
      // Don't fail the request if notification creation fails
    }

    // Send order confirmation email (no-op unless SMTP is configured)
    try {
      const emailConfig = await getEmailConfig()
      if (emailConfig.events.orderConfirmation) {
        const { data: buyer } = await supabaseAdmin
          .from('users')
          .select('email, name, preferences')
          .eq('id', session.userId)
          .single()

        // Respect the user's own "order updates" notification preference.
        const prefs = (buyer?.preferences && typeof buyer.preferences === 'object'
          ? buyer.preferences
          : {}) as Record<string, unknown>
        const wantsOrderEmails = prefs.orderUpdates !== false

        if (buyer?.email && wantsOrderEmails) {
          await sendOrderConfirmationEmail({
            to: buyer.email,
            customerName: buyer.name,
            orderNumber: order.orderNumber,
            orderId: order.id,
            total: totalAmount,
            items: validatedItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
          })
        }
      }
    } catch (error) {
      console.error('Error sending order confirmation email:', error)
      // Don't fail the request if email sending fails
    }

    // Notify shop owner(s) when their shop gets an order
    try {
      const shopIds = new Set<string>()
      for (const item of items) {
        const product = productMap.get(item.productId)
        if (product?.shopId) shopIds.add(product.shopId)
      }
      if (shopIds.size > 0) {
        const { data: shops } = await supabaseAdmin
          .from('shops')
          .select('id, userId')
          .in('id', Array.from(shopIds))

        const ownerIds = new Set<string>()
        for (const shop of shops || []) {
          if (shop.userId && shop.userId !== session.userId) {
            ownerIds.add(shop.userId)
          }
        }
        await createNotificationsForUsers(Array.from(ownerIds), {
          title: 'New order received',
          message: `Your shop has a new order: ${order.orderNumber}`,
          type: 'order',
          link: `/seller/orders/${order.id}`,
        })
      }
    } catch (error) {
      console.error('Error creating seller order notification:', error)
      // Don't fail the request if notification creation fails
    }

    // Add main-shop products to buyer's store when addToStore and payment is done (balance)
    if (addToStore && paymentMethod === 'balance') {
      try {
        const { data: buyerShop } = await supabaseAdmin
          .from('shops')
          .select('id')
          .eq('userId', session.userId)
          .maybeSingle()
        if (buyerShop) {
          const mainShopProductIds = items
            .map((item: any) => {
              const p = productMap.get(item.productId)
              return p?.shopId == null ? item.productId : null
            })
            .filter(Boolean) as string[]
          const uniqueIds = Array.from(new Set(mainShopProductIds))
          if (uniqueIds.length > 0) {
            const { data: fullProducts } = await supabaseAdmin
              .from('products')
              .select('*')
              .in('id', uniqueIds)
              .is('shopId', null)
            const { data: productImages } = await supabaseAdmin
              .from('product_images')
              .select('*')
              .in('productId', uniqueIds)
            const imageByProduct = new Map<string, any[]>()
            for (const img of productImages || []) {
              if (!imageByProduct.has(img.productId)) imageByProduct.set(img.productId, [])
              imageByProduct.get(img.productId)!.push(img)
            }
            for (const orig of fullProducts || []) {
              const newSlug = `${orig.slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
              const { data: newProduct, error: insertErr } = await supabaseAdmin
                .from('products')
                .insert({
                  shopId: buyerShop.id,
                  categoryId: orig.categoryId,
                  name: orig.name,
                  slug: newSlug,
                  description: orig.description,
                  shortDesc: orig.shortDesc,
                  price: orig.price,
                  comparePrice: orig.comparePrice,
                  costPrice: orig.costPrice,
                  sku: orig.sku ? `${orig.sku}-${Date.now().toString(36)}` : null,
                  barcode: orig.barcode,
                  stock: orig.stock,
                  lowStockAlert: orig.lowStockAlert,
                  weight: orig.weight,
                  status: 'ACTIVE',
                  isFeatured: false,
                  isPromoted: false,
                })
                .select('id')
                .single()
              if (insertErr || !newProduct) continue
              const imgs = imageByProduct.get(orig.id) || []
              if (imgs.length > 0) {
                await supabaseAdmin.from('product_images').insert(
                  imgs.map((img: any, i: number) => ({
                    productId: newProduct.id,
                    url: img.url,
                    alt: img.alt,
                    sortOrder: img.sortOrder ?? i,
                    isPrimary: img.isPrimary ?? i === 0,
                  }))
                )
              }
            }
          }
        }
      } catch (err) {
        console.error('Add to store clone error:', err)
        // Don't fail the order
      }
    }

    return NextResponse.json({
      message: 'Order placed successfully',
      orderId: order.id,
      order: completeOrder,
    })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { message: 'Failed to place order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: orders, error } = await supabaseAdmin
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
      .eq('userId', session.userId)
      .order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    // Format orders to match expected structure
    const formattedOrders = (orders || []).map((order: any) => ({
      ...order,
      items: (order.items || []).map((item: any) => ({
        ...item,
        product: item.product ? {
          ...item.product,
          images: item.product.images || [],
        } : null,
      })),
    }))

    return NextResponse.json({ orders: formattedOrders })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
