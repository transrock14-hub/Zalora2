import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getSettlementAmountsForOwner } from '@/lib/wholesale-settlement'

export interface BillingRecord {
  id: string
  type: 'ORDER' | 'DEPOSIT' | 'WITHDRAWAL' | 'WHOLESALE_CHARGE' | 'SALES_PAYOUT' | 'WHOLESALE_REFUND'
  reference: string
  description: string
  amount: number
  currency: string
  status: string
  method: string | null
  createdAt: string
  /** When set, the billing row links to this store order detail page */
  linkOrderId?: string
}

/**
 * GET: unified billing/payment history for the current user.
 * Combines order payments, wallet deposits/withdrawals, and reseller
 * wholesale deductions + sales payouts for store orders.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [ordersRes, depositsRes, withdrawalsRes, shopRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, orderNumber, total, status, paymentStatus, paymentMethod, createdAt')
        .eq('userId', session.userId)
        .order('createdAt', { ascending: false }),
      supabaseAdmin
        .from('deposit_requests')
        .select('id, amount, currency, status, createdAt')
        .eq('userId', session.userId)
        .order('createdAt', { ascending: false }),
      supabaseAdmin
        .from('withdrawal_requests')
        .select('id, amount, currency, status, createdAt')
        .eq('userId', session.userId)
        .order('createdAt', { ascending: false }),
      supabaseAdmin
        .from('shops')
        .select('id')
        .eq('userId', session.userId)
        .maybeSingle(),
    ])

    const records: BillingRecord[] = []

    for (const o of ordersRes.data || []) {
      records.push({
        id: o.id,
        type: 'ORDER',
        reference: o.orderNumber,
        description: `Order #${o.orderNumber}`,
        amount: Number(o.total || 0),
        currency: 'USD',
        status: o.paymentStatus || o.status,
        method: o.paymentMethod ?? null,
        createdAt: o.createdAt,
      })
    }

    for (const d of depositsRes.data || []) {
      records.push({
        id: d.id,
        type: 'DEPOSIT',
        reference: d.id.slice(0, 8).toUpperCase(),
        description: 'Wallet top-up',
        amount: Number(d.amount || 0),
        currency: d.currency || 'USD',
        status: d.status,
        method: null,
        createdAt: d.createdAt,
      })
    }

    for (const w of withdrawalsRes.data || []) {
      records.push({
        id: w.id,
        type: 'WITHDRAWAL',
        reference: w.id.slice(0, 8).toUpperCase(),
        description: 'Wallet withdrawal',
        amount: Number(w.amount || 0),
        currency: w.currency || 'USD',
        status: w.status,
        method: null,
        createdAt: w.createdAt,
      })
    }

    // Reseller money flow: wholesale charged at PAID, sales payout at DELIVERED
    const shopId = shopRes.data?.id
    if (shopId) {
      type ShopOrderRow = {
        id: string
        orderNumber: string
        status: string
        wholesaleChargedAt: string | null
        salesPaidOutAt: string | null
        settlementRefundedAt: string | null
        updatedAt: string
        createdAt: string
      }

      let shopOrders: ShopOrderRow[] = []

      const withTs = await supabaseAdmin
        .from('orders')
        .select(
          'id, orderNumber, status, wholesaleChargedAt, salesPaidOutAt, settlementRefundedAt, updatedAt, createdAt'
        )
        .eq('shopId', shopId)
        .order('createdAt', { ascending: false })
        .limit(200)

      if (!withTs.error && withTs.data) {
        shopOrders = withTs.data as ShopOrderRow[]
      } else {
        const fallback = await supabaseAdmin
          .from('orders')
          .select('id, orderNumber, status, updatedAt, createdAt')
          .eq('shopId', shopId)
          .in('status', [
            'PAID',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'COMPLETED',
            'REFUNDED',
            'CANCELLED',
          ])
          .order('createdAt', { ascending: false })
          .limit(200)
        shopOrders = (fallback.data || []).map((o: any) => ({
          id: o.id as string,
          orderNumber: o.orderNumber as string,
          status: o.status as string,
          updatedAt: o.updatedAt as string,
          createdAt: o.createdAt as string,
          wholesaleChargedAt: [
            'PAID',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'COMPLETED',
            'REFUNDED',
            'CANCELLED',
          ].includes(o.status)
            ? (o.updatedAt || o.createdAt)
            : null,
          salesPaidOutAt: ['DELIVERED', 'COMPLETED'].includes(o.status)
            ? (o.updatedAt || o.createdAt)
            : null,
          settlementRefundedAt: ['REFUNDED', 'CANCELLED'].includes(o.status)
            ? (o.updatedAt || o.createdAt)
            : null,
        }))
      }

      for (const o of shopOrders) {
        let wholesale = 0
        let sales = 0
        try {
          const amounts = await getSettlementAmountsForOwner(o.id, session.userId)
          wholesale = amounts.wholesale
          sales = amounts.sales
        } catch (e) {
          console.warn('[billing] settlement amounts failed for', o.id, e)
          continue
        }

        const refunded =
          !!o.settlementRefundedAt || ['REFUNDED', 'CANCELLED'].includes(o.status)
        const charged =
          !!o.wholesaleChargedAt ||
          ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'REFUNDED', 'CANCELLED'].includes(
            o.status
          )
        const paidOut =
          !!o.salesPaidOutAt || ['DELIVERED', 'COMPLETED'].includes(o.status)

        if (charged && wholesale > 0) {
          records.push({
            id: `wholesale-${o.id}`,
            type: 'WHOLESALE_CHARGE',
            reference: o.orderNumber,
            description: `Order processing (wholesale) #${o.orderNumber}`,
            amount: wholesale,
            currency: 'USD',
            status: 'DEDUCTED',
            method: null,
            createdAt: o.wholesaleChargedAt || o.updatedAt || o.createdAt,
            linkOrderId: o.id,
          })
        }

        if (paidOut && sales > 0 && !refunded) {
          records.push({
            id: `sales-${o.id}`,
            type: 'SALES_PAYOUT',
            reference: o.orderNumber,
            description: `Sales payout #${o.orderNumber}`,
            amount: sales,
            currency: 'USD',
            status: 'CREDITED',
            method: null,
            createdAt: o.salesPaidOutAt || o.updatedAt || o.createdAt,
            linkOrderId: o.id,
          })
        }

        if (refunded && wholesale > 0) {
          records.push({
            id: `wholesale-refund-${o.id}`,
            type: 'WHOLESALE_REFUND',
            reference: o.orderNumber,
            description: `Order refund (wholesale returned) #${o.orderNumber}`,
            amount: wholesale,
            currency: 'USD',
            status: 'REFUNDED',
            method: null,
            createdAt: o.settlementRefundedAt || o.updatedAt || o.createdAt,
            linkOrderId: o.id,
          })
        }
      }
    }

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ records })
  } catch (e) {
    console.error('GET /api/account/billing', e)
    return NextResponse.json({ error: 'Failed to load billing records' }, { status: 500 })
  }
}
