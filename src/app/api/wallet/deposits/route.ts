import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { createNotification, notifyAdmins } from '@/lib/notifications'

// GET: list deposits (user or shop). ?scope=shop&shopId=xxx for shop balance.

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
      .from('deposit_requests')
      .select('*')
      .eq('userId', session.userId)
      .order('createdAt', { ascending: false })

    if (scope === 'shop' && shopId) {
      const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('id', shopId).eq('userId', session.userId).single()
      if (!shop) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      query = query.eq('shopId', shopId)
    } else {
      // User wallet only: exclude shop deposits so account balance and shop balance stay separate
      query = query.is('shopId', null)
    }

    const { data: rows, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ deposits: rows || [] })
  } catch (e) {
    console.error('GET /api/wallet/deposits', e)
    return NextResponse.json(
      { error: 'Failed to fetch deposits' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { currency, network, amount, proofUrl, shopId } = body

    if (!currency || amount == null || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Currency and a positive amount are required' },
        { status: 400 }
      )
    }

    let insertShopId: string | null = null
    if (shopId) {
      const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('id', shopId).eq('userId', session.userId).single()
      if (!shop) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      insertShopId = shopId
    }

    const { data: row, error } = await supabaseAdmin
      .from('deposit_requests')
      .insert({
        userId: session.userId,
        shopId: insertShopId,
        currency: String(currency).toUpperCase(),
        network: network || null,
        amount: Number(amount),
        proofUrl: proofUrl || null,
        status: 'PENDING',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const scope = insertShopId ? 'Shop balance' : 'Wallet'
    try {
      await createNotification({
        userId: session.userId,
        title: 'Deposit submitted',
        message: `${scope}: ${Number(row.amount).toFixed(2)} ${row.currency} pending approval`,
        type: 'payment',
        link: insertShopId ? '/seller/shop/wallet/recharge-record' : '/account/wallet/recharge-record',
      })
      await notifyAdmins({
        title: 'New deposit request',
        message: `${scope}: ${Number(row.amount).toFixed(2)} ${row.currency} — pending approval`,
        type: 'payment',
        link: '/admin/deposits',
      })
    } catch (e) {
      console.error('Notification error:', e)
    }

    return NextResponse.json({ deposit: row })
  } catch (e) {
    console.error('POST /api/wallet/deposits', e)
    return NextResponse.json(
      { error: 'Failed to create deposit' },
      { status: 500 }
    )
  }
}
