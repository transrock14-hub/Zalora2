import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { RechargeRecordClient } from '@/app/(store)/account/wallet/recharge-record/recharge-record-client'

export const dynamic = 'force-dynamic'

export default async function SellerShopRechargeRecordPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const { shop } = await getSellerShopAccess(user.id)
  if (!shop) redirect('/seller/create-shop')

  return (
    <RechargeRecordClient
      shopId={shop.id}
      backHref="/seller/shop"
      topupHref="/seller/shop/wallet/topup"
    />
  )
}
