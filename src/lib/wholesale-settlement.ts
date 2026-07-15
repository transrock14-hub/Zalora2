import { supabaseAdmin } from './supabase'

/**
 * Wholesale settlement for the reseller (shop owner) money flow.
 *
 * Model:
 *  - When the order is processed/shipped, wholesale (costPrice × qty) is
 *    temporarily deducted from the shop owner's balance (working-capital hold).
 *  - When the order is DELIVERED or COMPLETED, that hold is released and the
 *    full sales lump sum (order_items.price × qty) is credited.
 *    Net vs pre-order balance: +lump sum (sales).
 *  - When REFUNDED/CANCELLED before delivery: wholesale hold is returned.
 *    After delivery: only the sales lump sum is clawed back.
 *
 * Idempotency: orders.wholesaleChargedAt / salesPaidOutAt / settlementRefundedAt
 * (see supabase-wholesale-settlement-migration.sql).
 */

export type WholesaleSettlementCode =
  | 'INSUFFICIENT_BALANCE'
  | 'MISSING_COST_PRICE'

export class WholesaleSettlementError extends Error {
  code: WholesaleSettlementCode
  required?: number
  available?: number

  constructor(
    message: string,
    code: WholesaleSettlementCode,
    extra?: { required?: number; available?: number }
  ) {
    super(message)
    this.name = 'WholesaleSettlementError'
    this.code = code
    this.required = extra?.required
    this.available = extra?.available
  }
}

interface OrderItemRow {
  quantity: number
  price: number | string | null
  product: {
    name?: string | null
    shopId: string | null
    costPrice: number | string | null
  } | null
}

export interface ChargeWholesaleOptions {
  /** Only charge this shop owner (seller shipping their own items). */
  ownerId?: string
  /**
   * When false (default for ship), throw on insufficient funds / missing cost.
   * Payment flows may catch and defer until ship.
   */
  strict?: boolean
}

async function getOrderShopItems(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select(`
      quantity,
      price,
      product:products!order_items_productId_fkey (
        name,
        shopId,
        costPrice
      )
    `)
    .eq('orderId', orderId)

  if (error) throw error
  return (data || []) as unknown as OrderItemRow[]
}

/** Sum the given amount per shop OWNER (users.id) for a set of order items. */
async function amountsByOwner(
  items: OrderItemRow[],
  kind: 'wholesale' | 'sales'
): Promise<Map<string, number>> {
  const shopIds = Array.from(
    new Set(items.map((i) => i.product?.shopId).filter(Boolean))
  ) as string[]

  const totals = new Map<string, number>()
  if (shopIds.length === 0) return totals

  const { data: shops } = await supabaseAdmin
    .from('shops')
    .select('id, userId')
    .in('id', shopIds)

  const ownerByShop = new Map<string, string>(
    (shops || [])
      .filter((s: any) => s.userId)
      .map((s: any) => [s.id as string, s.userId as string])
  )

  for (const item of items) {
    const shopId = item.product?.shopId
    if (!shopId) continue
    const ownerId = ownerByShop.get(shopId)
    if (!ownerId) continue

    const qty = Math.max(0, Number(item.quantity) || 0)
    const unit =
      kind === 'wholesale'
        ? Number(item.product?.costPrice ?? 0)
        : Number(item.price ?? 0)

    if (!(unit > 0) || qty <= 0) continue
    totals.set(ownerId, (totals.get(ownerId) ?? 0) + unit * qty)
  }

  return totals
}

async function shopsOwnedBy(userId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from('shops').select('id').eq('userId', userId)
  return new Set((data || []).map((s: { id: string }) => s.id))
}

/** Ensure every item for the given owners has a positive wholesale cost. */
async function assertWholesaleCostsPresent(
  items: OrderItemRow[],
  ownerIds: Set<string>
): Promise<void> {
  if (ownerIds.size === 0) return

  const shopIds = Array.from(
    new Set(items.map((i) => i.product?.shopId).filter(Boolean))
  ) as string[]
  if (shopIds.length === 0) return

  const { data: shops } = await supabaseAdmin
    .from('shops')
    .select('id, userId')
    .in('id', shopIds)

  const ownerByShop = new Map<string, string>(
    (shops || [])
      .filter((s: any) => s.userId)
      .map((s: any) => [s.id as string, s.userId as string])
  )

  const missing: string[] = []
  for (const item of items) {
    const shopId = item.product?.shopId
    if (!shopId) continue
    const ownerId = ownerByShop.get(shopId)
    if (!ownerId || !ownerIds.has(ownerId)) continue
    const qty = Math.max(0, Number(item.quantity) || 0)
    if (qty <= 0) continue
    const cost = Number(item.product?.costPrice ?? 0)
    if (!(cost > 0)) {
      missing.push(item.product?.name || 'Unknown product')
    }
  }

  if (missing.length > 0) {
    throw new WholesaleSettlementError(
      `Cannot process order: wholesale (cost) price is missing or zero for: ${missing.join(', ')}. Ask admin to set cost price first.`,
      'MISSING_COST_PRICE'
    )
  }
}

async function adjustUserBalance(
  userId: string,
  delta: number,
  opts?: { allowNegative?: boolean }
): Promise<void> {
  if (!delta) return
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single()
  const current = Number(user?.balance ?? 0)
  const next = current + delta

  if (delta < 0 && next < -0.0001 && !opts?.allowNegative) {
    throw new WholesaleSettlementError(
      `Insufficient store balance to cover wholesale cost. Required ${Math.abs(delta).toFixed(2)}, available ${current.toFixed(2)}. Top up your wallet and try again.`,
      'INSUFFICIENT_BALANCE',
      { required: Math.abs(delta), available: current }
    )
  }

  await supabaseAdmin
    .from('users')
    .update({ balance: next })
    .eq('id', userId)

  // Keep shop balance identical to the owner's personal account balance so
  // Shop Balance / Account Balance / homepage all show the same figure.
  await supabaseAdmin.from('shops').update({ balance: next }).eq('userId', userId)
}

/**
 * Mirror the owner's personal balance onto their shop row (no money movement).
 * Call after any users.balance change outside this module (e.g. deposits).
 */
export async function syncShopBalanceFromUser(userId: string): Promise<void> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single()
  if (!user) return
  await supabaseAdmin
    .from('shops')
    .update({ balance: Number(user.balance ?? 0) })
    .eq('userId', userId)
}

/** Returns true if the order was already settled for the given phase (column may be absent). */
async function alreadySettled(
  orderId: string,
  column: 'wholesaleChargedAt' | 'salesPaidOutAt' | 'settlementRefundedAt'
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`${column}, settlementRefundedAt`)
    .eq('id', orderId)
    .single()
  // If the column doesn't exist yet, treat as not-settled (callers guard by status).
  if (error) return false
  const row = data as Record<string, unknown>
  // A refund reverses money movement; charge/payout markers alone are not "active".
  if (column !== 'settlementRefundedAt' && row?.settlementRefundedAt) {
    return false
  }
  return !!row?.[column]
}

async function markSettled(
  orderId: string,
  column: 'wholesaleChargedAt' | 'salesPaidOutAt' | 'settlementRefundedAt'
): Promise<void> {
  const patch: Record<string, unknown> = {
    [column]: new Date().toISOString(),
  }
  // Re-opening charge/payout after a refund clears the refund marker.
  if (column === 'wholesaleChargedAt' || column === 'salesPaidOutAt') {
    patch.settlementRefundedAt = null
  }
  await supabaseAdmin
    .from('orders')
    .update(patch as any)
    .eq('id', orderId)
  // Ignore errors (e.g. column not present yet).
}

/**
 * Charge each reseller the wholesale price of their items in this order.
 * Deducts from the shop owner's personal account balance. Idempotent.
 * Throws WholesaleSettlementError when funds/cost are insufficient (never goes negative).
 */
export async function chargeWholesaleForOrder(
  orderId: string,
  options: ChargeWholesaleOptions = {}
): Promise<{ charged: boolean }> {
  const strict = options.strict !== false

  if (await alreadySettled(orderId, 'wholesaleChargedAt')) {
    return { charged: false }
  }

  const items = await getOrderShopItems(orderId)
  let totals = await amountsByOwner(items, 'wholesale')

  if (options.ownerId) {
    const ownedShops = await shopsOwnedBy(options.ownerId)
    const sellerItems = items.filter(
      (i) => i.product?.shopId && ownedShops.has(i.product.shopId)
    )
    if (sellerItems.length > 0) {
      await assertWholesaleCostsPresent(items, new Set([options.ownerId]))
    }
    const amount = totals.get(options.ownerId) ?? 0
    totals = amount > 0 ? new Map([[options.ownerId, amount]]) : new Map()
    if (sellerItems.length > 0 && amount <= 0) {
      throw new WholesaleSettlementError(
        'Cannot ship: wholesale (cost) price is missing or zero for your product(s). Contact support/admin to set cost prices.',
        'MISSING_COST_PRICE'
      )
    }
  } else {
    const shopIds = Array.from(
      new Set(items.map((i) => i.product?.shopId).filter(Boolean))
    ) as string[]
    if (shopIds.length > 0) {
      const { data: shops } = await supabaseAdmin
        .from('shops')
        .select('userId')
        .in('id', shopIds)
      const ownerIds = new Set(
        (shops || []).map((s: { userId: string }) => s.userId).filter(Boolean)
      )
      await assertWholesaleCostsPresent(items, ownerIds)
      if (totals.size === 0 && ownerIds.size > 0) {
        const err = new WholesaleSettlementError(
          'Cannot process wholesale: product cost prices are missing or zero.',
          'MISSING_COST_PRICE'
        )
        if (strict) throw err
        console.warn('chargeWholesaleForOrder deferred:', err.message)
        return { charged: false }
      }
    }
  }

  // Pre-check balances so we never partially debit
  for (const [ownerId, amount] of Array.from(totals.entries())) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', ownerId)
      .single()
    const available = Number(user?.balance ?? 0)
    if (available + 0.0001 < amount) {
      const err = new WholesaleSettlementError(
        `Insufficient store balance to ship. Wholesale cost is $${amount.toFixed(2)} but available balance is $${available.toFixed(2)}. Top up your wallet first.`,
        'INSUFFICIENT_BALANCE',
        { required: amount, available }
      )
      if (strict) throw err
      console.warn('chargeWholesaleForOrder deferred:', err.message)
      return { charged: false }
    }
  }

  for (const [ownerId, amount] of Array.from(totals.entries())) {
    await adjustUserBalance(ownerId, -amount)
  }

  if (totals.size > 0) {
    await markSettled(orderId, 'wholesaleChargedAt')
  }

  return { charged: totals.size > 0 }
}

/**
 * Pay each reseller the sales (lump sum) price only.
 * Prefer settleDeliveryForOrder on Delivered/Completed — that also releases
 * the wholesale hold so the net credit is the full lump sum vs pre-order balance.
 */
export async function payoutSalesForOrder(orderId: string): Promise<{ paid: boolean }> {
  if (await alreadySettled(orderId, 'salesPaidOutAt')) {
    return { paid: false }
  }

  const items = await getOrderShopItems(orderId)
  const totals = await amountsByOwner(items, 'sales')

  for (const [ownerId, amount] of Array.from(totals.entries())) {
    await adjustUserBalance(ownerId, amount)
  }

  if (totals.size > 0) {
    await markSettled(orderId, 'salesPaidOutAt')
  }

  return { paid: totals.size > 0 }
}

/**
 * Delivery / completion settlement:
 * 1) Ensure wholesale hold was deducted (re-charge after a prior refund)
 * 2) Release the wholesale hold AND credit the sales lump sum
 *
 * Net vs pre-order balance: +lump sum (sales).
 * Example: $800 top-up → −$545.83 hold → +$545.83 release + $655 sales → $1,455.
 */
export async function settleDeliveryForOrder(
  orderId: string,
  options: ChargeWholesaleOptions = {}
): Promise<void> {
  await chargeWholesaleForOrder(orderId, {
    ...options,
    strict: options.strict !== false,
  })

  if (await alreadySettled(orderId, 'salesPaidOutAt')) {
    return
  }

  const items = await getOrderShopItems(orderId)
  const wholesaleMap = await amountsByOwner(items, 'wholesale')
  const salesMap = await amountsByOwner(items, 'sales')

  const ownerIds = new Set<string>([
    ...Array.from(wholesaleMap.keys()),
    ...Array.from(salesMap.keys()),
  ])

  for (const ownerId of Array.from(ownerIds)) {
    const releaseHold = wholesaleMap.get(ownerId) ?? 0
    const lumpSum = salesMap.get(ownerId) ?? 0
    // Release temporary wholesale hold + credit full sales (lump sum)
    const credit = releaseHold + lumpSum
    if (credit > 0) {
      await adjustUserBalance(ownerId, credit)
    }
  }

  await markSettled(orderId, 'salesPaidOutAt')
}

/**
 * Compute wholesale charge and sales payout amounts for a specific shop owner
 * on a given order. Used by billing history.
 */
export async function getSettlementAmountsForOwner(
  orderId: string,
  ownerId: string
): Promise<{ wholesale: number; sales: number }> {
  const items = await getOrderShopItems(orderId)
  const wholesaleMap = await amountsByOwner(items, 'wholesale')
  const salesMap = await amountsByOwner(items, 'sales')
  return {
    wholesale: wholesaleMap.get(ownerId) ?? 0,
    sales: salesMap.get(ownerId) ?? 0,
  }
}

/**
 * When an order is refunded/cancelled:
 *  - Before delivery: return the wholesale hold
 *  - After delivery: claw back the sales lump sum only (hold was already
 *    released as part of completion, so do not credit wholesale again)
 */
export async function refundSettlementForOrder(
  orderId: string
): Promise<{ refundedWholesale: number; clawedBackSales: number }> {
  const result = { refundedWholesale: 0, clawedBackSales: 0 }
  try {
    const refundedCheck = await supabaseAdmin
      .from('orders')
      .select('settlementRefundedAt')
      .eq('id', orderId)
      .maybeSingle()
    if (!refundedCheck.error && (refundedCheck.data as any)?.settlementRefundedAt) {
      return result
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('wholesaleChargedAt, salesPaidOutAt')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      console.error('refundSettlementForOrder: cannot read order markers', error.message)
      return result
    }

    const wholesaleWasCharged = !!(order as any)?.wholesaleChargedAt
    const salesWerePaid = !!(order as any)?.salesPaidOutAt

    if (!wholesaleWasCharged && !salesWerePaid) return result

    const items = await getOrderShopItems(orderId)
    const salesMap = await amountsByOwner(items, 'sales')
    const wholesaleMap = await amountsByOwner(items, 'wholesale')

    if (salesWerePaid) {
      // Completion credited (wholesale release + sales). Reverse net = claw sales only.
      for (const [ownerId, amount] of Array.from(salesMap.entries())) {
        await adjustUserBalance(ownerId, -amount, { allowNegative: true })
        result.clawedBackSales += amount
      }
    } else if (wholesaleWasCharged) {
      for (const [ownerId, amount] of Array.from(wholesaleMap.entries())) {
        await adjustUserBalance(ownerId, amount)
        result.refundedWholesale += amount
      }
    }

    await supabaseAdmin
      .from('orders')
      .update({
        settlementRefundedAt: new Date().toISOString(),
        salesPaidOutAt: null,
      } as any)
      .eq('id', orderId)
  } catch (e) {
    console.error('refundSettlementForOrder failed:', e)
  }
  return result
}
