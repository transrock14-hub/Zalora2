import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { RechargeMethodsClient } from '@/app/(store)/account/wallet/topup/recharge-methods-client'

export const dynamic = 'force-dynamic'

export default async function SellerShopTopUpPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const { shop, canAccessOrdersAndTopUp, isOrderSlaBlocked } = await getSellerShopAccess(user.id)
  if (!shop) redirect('/seller/create-shop')
  if (!canAccessOrdersAndTopUp) redirect('/seller/verification-status')

  // Shops use platform (admin) deposit addresses only; no shop-specific addresses
  const { data: addresses } = await supabaseAdmin
    .from('crypto_addresses')
    .select('id, currency, address, network, label, qrCode')
    .eq('isActive', true)
    .is('shopId', null)
    .order('currency', { ascending: true })

  return (
    <RechargeMethodsClient
      addresses={addresses || []}
      depositBasePath="/seller/shop/wallet/topup/deposit"
      backHref={isOrderSlaBlocked ? '/seller/orders?status=pending&blocked=1' : '/seller/shop'}
      recordHref="/seller/shop/wallet/recharge-record"
    />
  )
}
