import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ShopStatus } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const shopId = params.id
    const body = await req.json()
    const { status, rejectionReason } = body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be APPROVED or REJECTED' },
        { status: 400 }
      )
    }

    if (status === 'REJECTED' && typeof rejectionReason !== 'string') {
      return NextResponse.json(
        { error: 'rejectionReason is required when rejecting' },
        { status: 400 }
      )
    }

    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('shop_verifications')
      .select('id, shopId, userId')
      .eq('shopId', shopId)
      .single()

    if (fetchError || !verification) {
      return NextResponse.json(
        { error: 'KYC verification not found for this shop' },
        { status: 404 }
      )
    }

    const updatePayload: Record<string, unknown> = {
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: session.userId,
    }
    if (status === 'REJECTED') {
      updatePayload.rejectionReason = rejectionReason?.trim() || 'Application rejected.'
    } else {
      updatePayload.rejectionReason = null
    }

    const { error: updateError } = await supabaseAdmin
      .from('shop_verifications')
      .update(updatePayload)
      .eq('id', verification.id)

    if (updateError) {
      throw updateError
    }

    if (status === 'APPROVED' && verification.userId) {
      await supabaseAdmin
        .from('shops')
        .update({ status: ShopStatus.ACTIVE })
        .eq('id', shopId)
      await supabaseAdmin
        .from('users')
        .update({ canSell: true })
        .eq('id', verification.userId)
    }

    return NextResponse.json({ success: true, status })
  } catch (error: unknown) {
    console.error('Admin KYC verification update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
