import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type DateRange = '7d' | '30d' | '90d' | 'all'

function rangeStart(range: DateRange): Date | null {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const range = (request.nextUrl.searchParams.get('range') || '30d') as DateRange
    const since = rangeStart(['7d', '30d', '90d', 'all'].includes(range) ? range : '30d')

    const ordersInRangeQuery = supabaseAdmin.from('orders').select('id, total, createdAt, paymentStatus, status')
    if (since) {
      ordersInRangeQuery.gte('createdAt', since.toISOString())
    }

    const [
      usersCount,
      productsCount,
      activeShopsCount,
      openTicketsCount,
      ordersInRange,
      recentOrdersResult,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabaseAdmin.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
      ordersInRangeQuery,
      supabaseAdmin
        .from('orders')
        .select(`
          id, orderNumber, total, status, createdAt,
          user:users!orders_userId_fkey ( name )
        `)
        .order('createdAt', { ascending: false })
        .limit(5),
    ])

    const orders = ordersInRange.data || []
    const totalOrders = orders.length
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.total || 0), 0)
    const pendingOrders = orders.filter((o) => o.status === 'PENDING_PAYMENT').length

    // Build daily chart buckets
    const chartMap = new Map<string, { date: string; orders: number; revenue: number }>()
    if (since) {
      const cursor = new Date(since)
      const end = new Date()
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10)
        chartMap.set(key, { date: key, orders: 0, revenue: 0 })
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    for (const order of orders) {
      const key = dayKey(order.createdAt)
      if (!chartMap.has(key)) {
        chartMap.set(key, { date: key, orders: 0, revenue: 0 })
      }
      const bucket = chartMap.get(key)!
      bucket.orders += 1
      if (order.paymentStatus === 'COMPLETED') {
        bucket.revenue += Number(order.total || 0)
      }
    }
    const chartData = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      range,
      totalUsers: usersCount.count || 0,
      totalOrders,
      totalProducts: productsCount.count || 0,
      totalRevenue,
      pendingOrders,
      activeShops: activeShopsCount.count || 0,
      openTickets: openTicketsCount.count || 0,
      chartData,
      recentOrders: (recentOrdersResult.data || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        userName: order.user?.name || 'Unknown',
        total: Number(order.total || 0),
        status: order.status,
      })),
    })
  } catch (e) {
    console.error('GET /api/admin/dashboard/stats', e)
    return NextResponse.json({ message: 'Failed to load dashboard stats' }, { status: 500 })
  }
}
