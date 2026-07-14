import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { WithdrawalRecordClient } from '@/app/(store)/account/wallet/withdrawal-record/withdrawal-record-client'

export const dynamic = 'force-dynamic'

export default async function SellerShopWithdrawalRecordPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const { shop } = await getSellerShopAccess(user.id)
  if (!shop) redirect('/seller/create-shop')

  return (
    <WithdrawalRecordClient
      shopId={shop.id}
      backHref="/seller/shop"
      withdrawHref="/seller/shop/wallet/withdraw"
    />
  )
}
