import { NextResponse } from 'next/server'
import { getSellerShopAccess } from '@/lib/auth'

/** API guard: reject mutating seller actions when shop is order-SLA blocked. */
export async function assertSellerCanMutateShop(userId: string): Promise<
  | { ok: true; shop: NonNullable<Awaited<ReturnType<typeof getSellerShopAccess>>['shop']> }
  | { ok: false; response: NextResponse }
> {
  const access = await getSellerShopAccess(userId)
  if (!access.shop) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Shop not found' }, { status: 404 }),
    }
  }
  if (access.isOrderSlaBlocked) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Merchant Store Blocked! An order was not processed within 24 hours. Only Top Up and Store Orders are available until the outstanding order has been processed.',
          code: 'SHOP_ORDER_SLA_BLOCKED',
        },
        { status: 403 }
      ),
    }
  }
  if (!access.canAccessShop) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Shop is not active. Complete verification first.', code: 'SHOP_INACTIVE' },
        { status: 403 }
      ),
    }
  }
  return { ok: true, shop: access.shop }
}
