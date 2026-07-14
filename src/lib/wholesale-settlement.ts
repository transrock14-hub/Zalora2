import { supabaseAdmin } from './supabase'

/**
 * Wholesale settlement for the reseller (shop owner) money flow.
 *
 * Model:
 *  - When a customer's order is PAID (or when the seller processes/ships it,
 *    whichever comes first and not yet charged), the reseller PAYS the
 *    wholesale price (product.costPrice x qty) — deducted from their personal
 *    account balance (users.balance). shops.balance is kept in sync.
 *  - When the order is DELIVERED, the reseller RECEIVES the sales price
 *    (order_items.price x qty) — credited to the same balance.
 *  - When the order is REFUNDED/CANCELLED, sales payout (if any) is clawed
 *    back and the wholesale lump sum is credited back to the same balance.
 *
 * Net profit for the reseller = sales price - wholesale price.
 *
 * Idempotency is enforced via the orders.wholesaleChargedAt / salesPaidOutAt /
 * settlementRefundedAt columns (see supabase-wholesale-settlement-migration.sql).
 */

interface OrderItemRow {
  quantity: number
  price: number | string | null
  product: { shopId: string | null; costPrice: number | string | null } | null
}

async function getOrderShopItems(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await supabaseAdmin
    .from('order_items')
    .select(`
      quantity,
      price,
      product:products!order_items_productId_fkey (
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

async function adjustUserBalance(userId: string, delta: number): Promise<void> {
  if (!delta) return
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single()
  const next = Number(user?.balance ?? 0) + delta
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
    .select(column)
    .eq('id', orderId)
    .single()
  // If the column doesn't exist yet, treat as not-settled (callers guard by status).
  if (error) return false
  return !!(data as Record<string, unknown>)?.[column]
}

async function markSettled(
  orderId: string,
  column: 'wholesaleChargedAt' | 'salesPaidOutAt' | 'settlementRefundedAt'
): Promise<void> {
  await supabaseAdmin
    .from('orders')
    .update({ [column]: new Date().toISOString() })
    .eq('id', orderId)
  // Ignore errors (e.g. column not present yet).
}

/**
 * Charge each reseller the wholesale price of their items in this order.
 * Deducts from the shop owner's personal account balance. Idempotent.
 */
export async function chargeWholesaleForOrder(orderId: string): Promise<void> {
  try {
    if (await alreadySettled(orderId, 'wholesaleChargedAt')) return

    const items = await getOrderShopItems(orderId)
    const totals = await amountsByOwner(items, 'wholesale')

    for (const [ownerId, amount] of Array.from(totals.entries())) {
      await adjustUserBalance(ownerId, -amount)
    }

    await markSettled(orderId, 'wholesaleChargedAt')
  } catch (e) {
    console.error('chargeWholesaleForOrder failed:', e)
  }
}

/**
 * Pay each reseller the sales price of their items in this order.
 * Credits the shop owner's personal account balance. Idempotent.
 */
export async function payoutSalesForOrder(orderId: string): Promise<void> {
  try {
    if (await alreadySettled(orderId, 'salesPaidOutAt')) return

    const items = await getOrderShopItems(orderId)
    const totals = await amountsByOwner(items, 'sales')

    for (const [ownerId, amount] of Array.from(totals.entries())) {
      await adjustUserBalance(ownerId, amount)
    }

    await markSettled(orderId, 'salesPaidOutAt')
  } catch (e) {
    console.error('payoutSalesForOrder failed:', e)
  }
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
 * When an order is refunded/cancelled, restore the shop AND account balance:
 *  - Claw back any sales payout already credited on delivery
 *  - Credit back the wholesale amount that was deducted to process the order
 *
 * Both users.balance and shops.balance stay identical (via adjustUserBalance).
 * Idempotent: uses settlementRefundedAt when present, otherwise clears the
 * charge/payout timestamps after reversing so a second call is a no-op.
 */
export async function refundSettlementForOrder(
  orderId: string
): Promise<{ refundedWholesale: number; clawedBackSales: number }> {
  const result = { refundedWholesale: 0, clawedBackSales: 0 }
  try {
    // Prefer explicit refund marker when the column exists
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

    // Nothing was ever moved for this order — don't invent credits
    if (!wholesaleWasCharged && !salesWerePaid) return result

    const items = await getOrderShopItems(orderId)
    const salesMap = await amountsByOwner(items, 'sales')
    const wholesaleMap = await amountsByOwner(items, 'wholesale')

    if (salesWerePaid) {
      for (const [ownerId, amount] of Array.from(salesMap.entries())) {
        await adjustUserBalance(ownerId, -amount)
        result.clawedBackSales += amount
      }
    }

    if (wholesaleWasCharged) {
      for (const [ownerId, amount] of Array.from(wholesaleMap.entries())) {
        await adjustUserBalance(ownerId, amount)
        result.refundedWholesale += amount
      }
    }

    // Mark done: clear charge markers (works even if settlementRefundedAt is missing)
    await supabaseAdmin
      .from('orders')
      .update({
        wholesaleChargedAt: null,
        salesPaidOutAt: null,
        settlementRefundedAt: new Date().toISOString(),
      } as any)
      .eq('id', orderId)
  } catch (e) {
    console.error('refundSettlementForOrder failed:', e)
  }
  return result
}
