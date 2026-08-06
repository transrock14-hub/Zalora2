import { supabaseAdmin } from '@/lib/supabase'
import { ShopStatus } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

/** Hours a seller has to process (ship) an order before the shop is auto-blocked. */
export const ORDER_PROCESS_SLA_HOURS = 24

/** Order statuses that still need seller action ("not processed"). */
export const UNPROCESSED_ORDER_STATUSES = ['PENDING_PAYMENT', 'PAID', 'PROCESSING'] as const

export const ORDER_SLA_BLOCK_REASON = 'unprocessed_order_24h'

function slaCutoffIso(now = Date.now()): string {
  return new Date(now - ORDER_PROCESS_SLA_HOURS * 60 * 60 * 1000).toISOString()
}

export function isOrderSlaBlockedShop(shop: {
  status?: string | null
  autoBlockedAt?: string | null
} | null | undefined): boolean {
  if (!shop) return false
  return shop.status === ShopStatus.SUSPENDED && !!shop.autoBlockedAt
}

/**
 * True if the shop has any order still needing seller processing past the 24h SLA.
 * Uses paidAt when present, otherwise createdAt.
 */
export async function shopHasStaleUnprocessedOrders(shopId: string): Promise<boolean> {
  const cutoff = slaCutoffIso()

  const { data: byPaidAt, error: paidErr } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('shopId', shopId)
    .in('status', [...UNPROCESSED_ORDER_STATUSES])
    .not('paidAt', 'is', null)
    .lt('paidAt', cutoff)
    .limit(1)

  if (paidErr) {
    console.error('[shop-order-sla] stale paidAt query failed', paidErr)
  } else if (byPaidAt && byPaidAt.length > 0) {
    return true
  }

  const { data: byCreatedAt, error: createdErr } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('shopId', shopId)
    .in('status', [...UNPROCESSED_ORDER_STATUSES])
    .is('paidAt', null)
    .lt('createdAt', cutoff)
    .limit(1)

  if (createdErr) {
    console.error('[shop-order-sla] stale createdAt query failed', createdErr)
    return false
  }

  return !!(byCreatedAt && byCreatedAt.length > 0)
}

export async function blockShopForStaleOrders(shop: {
  id: string
  userId: string
  status: string
  name?: string | null
}): Promise<boolean> {
  if (shop.status !== ShopStatus.ACTIVE) return false

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      status: ShopStatus.SUSPENDED,
      autoBlockedAt: now,
      autoBlockReason: ORDER_SLA_BLOCK_REASON,
      updatedAt: now,
    })
    .eq('id', shop.id)
    .eq('status', ShopStatus.ACTIVE)

  if (error) {
    console.error('[shop-order-sla] block failed', shop.id, error)
    return false
  }

  try {
    await createNotification({
      userId: shop.userId,
      title: 'Merchant Store Blocked!',
      message:
        'Merchant Store Blocked! An order was not processed within 24 hours. Only Top Up and Store Orders remain available until the outstanding order has been processed.',
      type: 'system',
      link: '/seller/blocked',
    })
  } catch (e) {
    console.error('[shop-order-sla] notify block failed', e)
  }

  return true
}

/**
 * If the shop was auto-blocked for SLA and no stale orders remain, restore ACTIVE.
 * Does not clear manual admin suspensions (autoBlockedAt is null).
 */
export async function tryUnblockShopAfterOrdersProcessed(shopId: string): Promise<boolean> {
  const { data: shop, error } = await supabaseAdmin
    .from('shops')
    .select('id, userId, status, autoBlockedAt, autoBlockReason')
    .eq('id', shopId)
    .maybeSingle()

  if (error || !shop) return false
  if (!isOrderSlaBlockedShop(shop)) return false

  const stillStale = await shopHasStaleUnprocessedOrders(shopId)
  if (stillStale) return false

  const now = new Date().toISOString()
  const { error: updateErr } = await supabaseAdmin
    .from('shops')
    .update({
      status: ShopStatus.ACTIVE,
      autoBlockedAt: null,
      autoBlockReason: null,
      updatedAt: now,
    })
    .eq('id', shopId)
    .eq('status', ShopStatus.SUSPENDED)

  if (updateErr) {
    console.error('[shop-order-sla] unblock failed', shopId, updateErr)
    return false
  }

  try {
    await createNotification({
      userId: shop.userId,
      title: 'Store unblocked',
      message:
        'Outstanding orders were processed. Your store is active again and full seller tools are restored.',
      type: 'system',
      link: '/seller/dashboard',
    })
  } catch (e) {
    console.error('[shop-order-sla] notify unblock failed', e)
  }

  return true
}

/**
 * Enforce SLA for one shop: block if overdue, unblock if cleared.
 * Returns the latest shop row (or original if unchanged / not found).
 */
export async function enforceOrderSlaForShop(shop: {
  id: string
  userId: string
  status: string
  autoBlockedAt?: string | null
  autoBlockReason?: string | null
  name?: string | null
  [key: string]: any
}): Promise<typeof shop> {
  if (!shop?.id) return shop
  if (shop.status === ShopStatus.CLOSED || shop.status === ShopStatus.PENDING) {
    return shop
  }

  const hasStale = await shopHasStaleUnprocessedOrders(shop.id)

  if (hasStale && shop.status === ShopStatus.ACTIVE) {
    const blocked = await blockShopForStaleOrders(shop)
    if (blocked) {
      return {
        ...shop,
        status: ShopStatus.SUSPENDED,
        autoBlockedAt: new Date().toISOString(),
        autoBlockReason: ORDER_SLA_BLOCK_REASON,
      }
    }
  }

  if (!hasStale && isOrderSlaBlockedShop(shop)) {
    const unblocked = await tryUnblockShopAfterOrdersProcessed(shop.id)
    if (unblocked) {
      return {
        ...shop,
        status: ShopStatus.ACTIVE,
        autoBlockedAt: null,
        autoBlockReason: null,
      }
    }
  }

  return shop
}

/** Cron/batch: find ACTIVE shops with stale orders and suspend them. */
export async function blockAllShopsWithStaleOrders(): Promise<{
  checked: number
  blocked: number
  shopIds: string[]
}> {
  const cutoff = slaCutoffIso()
  const cutoffMs = new Date(cutoff).getTime()

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('shopId, paidAt, createdAt')
    .in('status', [...UNPROCESSED_ORDER_STATUSES])
    .not('shopId', 'is', null)
    .limit(2000)

  if (error) {
    console.error('[shop-order-sla] batch query failed', error)
    return { checked: 0, blocked: 0, shopIds: [] as string[] }
  }

  const shopIds = Array.from(
    new Set(
      (orders || [])
        .filter((o) => {
          const ts = o.paidAt ? new Date(o.paidAt).getTime() : new Date(o.createdAt).getTime()
          return Number.isFinite(ts) && ts < cutoffMs
        })
        .map((o) => o.shopId as string)
        .filter(Boolean)
    )
  )

  return blockShopIdsIfActive(shopIds)
}

async function blockShopIdsIfActive(shopIds: string[]) {
  if (shopIds.length === 0) {
    return { checked: 0, blocked: 0, shopIds: [] as string[] }
  }

  const { data: shops, error } = await supabaseAdmin
    .from('shops')
    .select('id, userId, status, name')
    .in('id', shopIds)
    .eq('status', ShopStatus.ACTIVE)

  if (error) {
    console.error('[shop-order-sla] load shops failed', error)
    return { checked: shopIds.length, blocked: 0, shopIds: [] as string[] }
  }

  const blockedIds: string[] = []
  for (const shop of shops || []) {
    const ok = await blockShopForStaleOrders(shop)
    if (ok) blockedIds.push(shop.id)
  }

  return { checked: shopIds.length, blocked: blockedIds.length, shopIds: blockedIds }
}
