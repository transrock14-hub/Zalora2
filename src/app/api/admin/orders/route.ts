import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS_ALIASES: Record<string, string> = {
  pending: 'PENDING_PAYMENT',
  confirming: 'PAYMENT_CONFIRMING',
  paid: 'PAID',
  processing: 'PROCESSING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

function resolveStatus(raw: string): string {
  const lower = raw.toLowerCase()
  return STATUS_ALIASES[lower] || raw
}

function escapeFilter(value: string): string {
  return value.replace(/[%_,.()]/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const paymentMethod = searchParams.get('paymentMethod')
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    let query = supabaseAdmin
      .from('orders')
      .select(
        `
        *,
        user:users!orders_userId_fkey (
          id,
          name,
          email
        ),
        address:addresses (*),
        items:order_items (
          *,
          product:products!order_items_productId_fkey (
            name,
            slug
          )
        )
      `,
        { count: 'exact' }
      )

    if (status && status !== 'all') {
      query = query.eq('status', resolveStatus(status))
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('paymentStatus', paymentStatus)
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('paymentMethod', paymentMethod)
    }

    if (search) {
      const q = escapeFilter(search)
      const { data: matchingUsers } = await supabaseAdmin
        .from('users')
        .select('id')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(50)

      const userIds = (matchingUsers || []).map((u) => u.id)
      if (userIds.length > 0) {
        query = query.or(`orderNumber.ilike.%${q}%,userId.in.(${userIds.join(',')})`)
      } else {
        query = query.ilike('orderNumber', `%${q}%`)
      }
    }

    const { data: orders, error, count } = await query
      .order('createdAt', { ascending: false })
      .range(skip, skip + limit - 1)

    if (error) {
      throw error
    }

    const result = orders || []
    const total = count ?? result.length
    const pages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      orders: result,
      total,
      page,
      pages,
      limit,
    })
  } catch (error) {
    console.error('Fetch orders error:', error)
    return NextResponse.json({ message: 'Failed to fetch orders' }, { status: 500 })
  }
}
