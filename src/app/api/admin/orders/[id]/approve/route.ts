import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { chargeWholesaleForOrder } from '@/lib/wholesale-settlement'

export async function POST(
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

    // Only charge wholesale on the transition into a paid state.
    const { data: prev } = await supabaseAdmin
      .from('orders')
      .select('status, paymentStatus')
      .eq('id', params.id)
      .single()
    const wasPaid =
      prev?.paymentStatus === 'COMPLETED' ||
      ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(prev?.status ?? '')

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({
        paymentStatus: 'COMPLETED',
        status: 'PAID',
        paidAt: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Reseller pays the wholesale price when the order becomes paid.
    if (!wasPaid) {
      await chargeWholesaleForOrder(params.id)
    }

    return NextResponse.json({
      message: 'Order payment approved successfully',
      order,
    })
  } catch (error) {
    console.error('Approve order error:', error)
    return NextResponse.json(
      { message: 'Failed to approve order' },
      { status: 500 }
    )
  }
}
