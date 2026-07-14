import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with shop (Supabase can return shops as array or single object)
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
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // Get all orders with items that have products from this shop
    let query = supabaseAdmin
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
            shopId
          )
        )
      `)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query.order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    // Filter orders to only include those with items from this shop
    const filteredOrders = (orders || [])
      .map((order: any) => {
        const shopItems = (order.items || []).filter(
          (item: any) => item.product?.shopId === shop.id
        )
        if (shopItems.length === 0) return null
        return {
          ...order,
          items: shopItems,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      orders: filteredOrders.map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
        createdAt: order.createdAt,
        userName: order.user?.name,
        userEmail: order.user?.email,
        items: order.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          image: item.image,
        })),
      })),
    })
  } catch (error) {
    console.error('Error fetching seller orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
