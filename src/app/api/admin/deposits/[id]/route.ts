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

    const { data: deposit, error: fetchErr } = await supabaseAdmin
      .from('deposit_requests')
      .select('id, userId, shopId, amount, status')
      .eq('id', id)
      .single()

    if (fetchErr || !deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    if (deposit.status !== 'PENDING') {
      return NextResponse.json({ error: 'Deposit already reviewed' }, { status: 400 })
    }

    if (status === 'APPROVED') {
      const addAmount = Number(deposit.amount)
      // Always credit the personal account balance — shop balance is kept in sync
      // so homepage / Account Balance / Shop Balance show the same amount.
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', deposit.userId)
        .single()
      const next = Number(user?.balance ?? 0) + addAmount
      const { error: updateUserErr } = await supabaseAdmin
        .from('users')
        .update({ balance: next })
        .eq('id', deposit.userId)
      if (updateUserErr) {
        return NextResponse.json({ error: 'Failed to credit balance' }, { status: 500 })
      }
      await syncShopBalanceFromUser(deposit.userId)
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('deposit_requests')
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
        userId: deposit.userId,
        title: status === 'APPROVED' ? 'Deposit approved' : 'Deposit rejected',
        message: status === 'APPROVED'
          ? `Your deposit of ${Number(deposit.amount).toFixed(2)} has been approved.`
          : 'Your deposit request was rejected.',
        type: 'payment',
        link: deposit.shopId ? '/seller/shop/wallet/recharge-record' : '/account/wallet/recharge-record',
      })
    } catch (e) {
      console.error('Notification error:', e)
    }

    return NextResponse.json({ deposit: updated })
  } catch (e) {
    console.error('PATCH /api/admin/deposits/[id]', e)
    return NextResponse.json({ error: 'Failed to update deposit' }, { status: 500 })
  }
}

/**
 * DELETE: Hide an APPROVED deposit from admin view only.
 * User recharge records and balances are unchanged.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { data: deposit, error: fetchErr } = await supabaseAdmin
      .from('deposit_requests')
      .select('id, status, hiddenFromAdmin')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) {
      if (
        (fetchErr as { code?: string }).code === 'PGRST204' ||
        fetchErr.message?.includes('hiddenFromAdmin')
      ) {
        return NextResponse.json(
          {
            error:
              'hiddenFromAdmin column is missing. Run supabase-wallet-admin-hide-migration.sql in Supabase SQL Editor.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Failed to hide deposit' }, { status: 500 })
    }
    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }
    if (deposit.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Only approved deposits can be removed from the admin list' },
        { status: 400 }
      )
    }
    if (deposit.hiddenFromAdmin) {
      return NextResponse.json({ success: true, hiddenFromAdmin: true })
    }

    const { error: updateErr } = await supabaseAdmin
      .from('deposit_requests')
      .update({ hiddenFromAdmin: true, updatedAt: new Date().toISOString() })
      .eq('id', id)

    if (updateErr) {
      if (
        (updateErr as { code?: string }).code === 'PGRST204' ||
        updateErr.message?.includes('hiddenFromAdmin')
      ) {
        return NextResponse.json(
          {
            error:
              'hiddenFromAdmin column is missing. Run supabase-wallet-admin-hide-migration.sql in Supabase SQL Editor.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: updateErr.message || 'Failed to hide deposit' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      hiddenFromAdmin: true,
      message: 'Deposit hidden from admin view; user can still see it',
    })
  } catch (e) {
    console.error('DELETE /api/admin/deposits/[id]', e)
    return NextResponse.json({ error: 'Failed to hide deposit' }, { status: 500 })
  }
}
