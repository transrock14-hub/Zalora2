import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { createNotification, notifyAdmins } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope')
    const shopId = searchParams.get('shopId')

    let query = supabaseAdmin
      .from('withdrawal_requests')
      .select('*')
      .eq('userId', session.userId)
      .order('createdAt', { ascending: false })

    if (scope === 'shop' && shopId) {
      const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('id', shopId).eq('userId', session.userId).single()
      if (!shop) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      query = query.eq('shopId', shopId)
    } else {
      // User wallet only: exclude shop withdrawals so account balance and shop balance stay separate
      query = query.is('shopId', null)
    }

    const { data: rows, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ withdrawals: rows || [] })
  } catch (e) {
    console.error('GET /api/wallet/withdrawals', e)
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { currency, network, address, amount, shopId, paymentPassword } = body

    if (!currency || !address || amount == null || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Currency, address and a positive amount are required' },
        { status: 400 }
      )
    }

    const payPass = typeof paymentPassword === 'string' ? paymentPassword : ''
    if (!payPass) {
      return NextResponse.json(
        { error: 'Payment password is required to withdraw' },
        { status: 400 }
      )
    }

    const { data: authUser, error: authUserErr } = await supabaseAdmin
      .from('users')
      .select('id, balance, paymentPassword')
      .eq('id', session.userId)
      .maybeSingle()

    if (authUserErr) {
      if (
        (authUserErr as { code?: string }).code === 'PGRST204' ||
        authUserErr.message?.includes('paymentPassword')
      ) {
        return NextResponse.json(
          {
            error:
              'Payment password is not configured on the server yet. Ask admin to run the migration.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Failed to verify payment password' }, { status: 500 })
    }

    const storedPay = (authUser as { paymentPassword?: string | null } | null)?.paymentPassword
    if (!storedPay) {
      return NextResponse.json(
        { error: 'Set a payment password in Account → Payment password before withdrawing' },
        { status: 400 }
      )
    }

    const { verifyPassword } = await import('@/lib/auth')
    const payOk = await verifyPassword(payPass, storedPay)
    if (!payOk) {
      return NextResponse.json({ error: 'Payment password is incorrect' }, { status: 400 })
    }

    let insertShopId: string | null = null
    let balance = 0
    if (shopId) {
      const { data: shop } = await supabaseAdmin.from('shops').select('id, balance').eq('id', shopId).eq('userId', session.userId).single()
      if (!shop) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      insertShopId = shopId
      balance = Number(shop?.balance ?? 0)
    } else {
      balance = Number(authUser?.balance ?? 0)
    }

    const withdrawAmount = Number(amount)
    if (withdrawAmount > balance) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    const { data: row, error } = await supabaseAdmin
      .from('withdrawal_requests')
      .insert({
        userId: session.userId,
        shopId: insertShopId,
        currency: String(currency).toUpperCase(),
        network: network || null,
        address: String(address).trim(),
        amount: withdrawAmount,
        status: 'PENDING',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const scope = insertShopId ? 'Shop balance' : 'Wallet'
    try {
      await createNotification({
        userId: session.userId,
        title: 'Withdrawal submitted',
        message: `${scope}: ${Number(row.amount).toFixed(2)} ${row.currency} pending approval`,
        type: 'payment',
        link: insertShopId ? '/seller/shop/wallet/withdrawal-record' : '/account/wallet/withdrawal-record',
      })
      await notifyAdmins({
        title: 'New withdrawal request',
        message: `${scope}: ${Number(row.amount).toFixed(2)} ${row.currency} — pending approval`,
        type: 'payment',
        link: '/admin/withdrawals',
      })
    } catch (e) {
      console.error('Notification error:', e)
    }

    return NextResponse.json({ withdrawal: row })
  } catch (e) {
    console.error('POST /api/wallet/withdrawals', e)
    return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
  }
}
