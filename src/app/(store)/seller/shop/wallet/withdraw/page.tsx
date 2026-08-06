import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { SellerShopWithdrawPageClient } from './withdraw-page-client'

export const dynamic = 'force-dynamic'

export default async function SellerShopWithdrawPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const { shop, canAccessShop, isOrderSlaBlocked } = await getSellerShopAccess(user.id)
  if (!shop) redirect('/seller/create-shop')
  if (isOrderSlaBlocked) redirect('/seller/blocked')
  if (!canAccessShop) redirect('/seller/verification-status')

  return <SellerShopWithdrawPageClient />
}
