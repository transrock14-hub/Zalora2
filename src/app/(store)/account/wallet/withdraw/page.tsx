import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { WithdrawPageClient } from './withdraw-page-client'

export const dynamic = 'force-dynamic'

export default async function WithdrawPage() {
  const user = await getCurrentUser()
  if (!user) return null

  if (user.canSell) {
    const { isOrderSlaBlocked } = await getSellerShopAccess(user.id)
    if (isOrderSlaBlocked) {
      redirect('/seller/blocked')
    }
  }

  return <WithdrawPageClient />
}
