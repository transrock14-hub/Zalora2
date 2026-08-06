import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { MerchantStoreBlocked } from '@/components/merchant-store-blocked'

export const dynamic = 'force-dynamic'

/**
 * Shown when a merchant tries to open any seller function other than
 * Store Orders / Top Up while the store is order-SLA blocked.
 */
export default async function SellerBlockedPage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (!user.canSell) {
    redirect('/account')
  }

  const { shop, isOrderSlaBlocked, canAccessShop } = await getSellerShopAccess(user.id)

  if (!shop) {
    redirect('/seller/create-shop')
  }

  // If no longer blocked, send them back to the dashboard.
  if (!isOrderSlaBlocked) {
    redirect(canAccessShop ? '/seller/dashboard' : '/seller/verification-status')
  }

  return <MerchantStoreBlocked />
}
