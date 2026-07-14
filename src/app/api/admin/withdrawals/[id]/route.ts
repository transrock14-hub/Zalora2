import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { syncShopBalanceFromUser } from '@/lib/wholesale-settlement'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'status must be APPROVED or REJECTED' }, { status: 400 })
    }

    const { data: withdrawal, error: fetchErr } = await supabaseAdmin
      .from('withdrawal_requests')
      .select('id, userId, shopId, amount, status')
      .eq('id', id)
      .single()

    if (fetchErr || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    if (withdrawal.status !== 'PENDING') {
      return NextResponse.json({ error: 'Withdrawal already reviewed' }, { status: 400 })
    }

    if (status === 'APPROVED') {
      const deductAmount = Number(withdrawal.amount)
      // Always deduct from personal account balance; mirror onto shop balance.
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', withdrawal.userId)
        .single()
      const currentBalance = Number(user?.balance ?? 0)
      if (deductAmount > currentBalance) {
        return NextResponse.json({ error: 'Balance too low' }, { status: 400 })
      }
      const { error: updateUserErr } = await supabaseAdmin
        .from('users')
        .update({ balance: currentBalance - deductAmount })
        .eq('id', withdrawal.userId)
      if (updateUserErr) {
        return NextResponse.json({ error: 'Failed to deduct balance' }, { status: 500 })
      }
      await syncShopBalanceFromUser(withdrawal.userId)
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('withdrawal_requests')
      .update({
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.userId,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    try {
      await createNotification({
        userId: withdrawal.userId,
        title: status === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal rejected',
        message: status === 'APPROVED'
          ? `Your withdrawal of ${Number(withdrawal.amount).toFixed(2)} has been approved.`
          : 'Your withdrawal request was rejected.',
        type: 'payment',
        link: withdrawal.shopId ? '/seller/shop/wallet/withdrawal-record' : '/account/wallet/withdrawal-record',
      })
    } catch (e) {
      console.error('Notification error:', e)
    }

    return NextResponse.json({ withdrawal: updated })
  } catch (e) {
    console.error('PATCH /api/admin/withdrawals/[id]', e)
    return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 })
  }
}
