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
    // Chart window capped so "all" doesn't pull the entire orders table
    const chartSince = since ?? (() => {
      const d = new Date()
      d.setDate(d.getDate() - 90)
      d.setHours(0, 0, 0, 0)
      return d
    })()

    let ordersCountQ = supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
    let revenueQ = supabaseAdmin
      .from('orders')
      .select('total')
      .eq('paymentStatus', 'COMPLETED')
    let pendingQ = supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING_PAYMENT')
    let chartQ = supabaseAdmin
      .from('orders')
      .select('total, createdAt, paymentStatus')
      .gte('createdAt', chartSince.toISOString())
      .order('createdAt', { ascending: true })
      .limit(2000)

    if (since) {
      const iso = since.toISOString()
      ordersCountQ = ordersCountQ.gte('createdAt', iso)
      revenueQ = revenueQ.gte('createdAt', iso)
      pendingQ = pendingQ.gte('createdAt', iso)
    }

    const [
      usersCount,
      productsCount,
      activeShopsCount,
      openTicketsCount,
      ordersCount,
      revenueRows,
      pendingCount,
      chartRows,
      recentOrdersResult,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabaseAdmin
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'OPEN'),
      ordersCountQ,
      revenueQ.limit(5000),
      pendingQ,
      chartQ,
      supabaseAdmin
        .from('orders')
        .select(
          `
          id, orderNumber, total, status, createdAt,
          user:users!orders_userId_fkey ( name )
        `
        )
        .order('createdAt', { ascending: false })
        .limit(5),
    ])

    const totalRevenue = (revenueRows.data || []).reduce(
      (sum, o) => sum + Number(o.total || 0),
      0
    )

    const chartMap = new Map<string, { date: string; orders: number; revenue: number }>()
    {
      const cursor = new Date(chartSince)
      const end = new Date()
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10)
        chartMap.set(key, { date: key, orders: 0, revenue: 0 })
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    for (const order of chartRows.data || []) {
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
      totalOrders: ordersCount.count || 0,
      totalProducts: productsCount.count || 0,
      totalRevenue,
      pendingOrders: pendingCount.count || 0,
      activeShops: activeShopsCount.count || 0,
      openTickets: openTicketsCount.count || 0,
      chartData,
      recentOrders: (recentOrdersResult.data || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        userName: Array.isArray(order.user)
          ? order.user[0]?.name || 'Unknown'
          : order.user?.name || 'Unknown',
        total: Number(order.total || 0),
        status: order.status,
      })),
    })
  } catch (e) {
    console.error('GET /api/admin/dashboard/stats', e)
    return NextResponse.json({ message: 'Failed to load dashboard stats' }, { status: 500 })
  }
}
