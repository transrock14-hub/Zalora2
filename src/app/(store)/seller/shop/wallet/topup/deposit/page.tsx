import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { DepositFormClient } from '@/app/(store)/account/wallet/topup/deposit/deposit-form-client'

export const dynamic = 'force-dynamic'

export default async function SellerShopDepositPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null
  const { shop } = await getSellerShopAccess(user.id)
  if (!shop) redirect('/seller/create-shop')

  const { currency: currencyParam } = await searchParams
  const currency = (currencyParam || '').toUpperCase().trim()
  if (!currency) redirect('/seller/shop/wallet/topup')

  const { data: shopRow } = await supabaseAdmin
    .from('shops')
    .select('balance')
    .eq('id', shop.id)
    .single()

  // Shops use platform (admin) deposit addresses only
  const { data: addresses } = await supabaseAdmin
    .from('crypto_addresses')
    .select('id, currency, address, network, label, qrCode')
    .eq('isActive', true)
    .is('shopId', null)
    .ilike('currency', currency)
    .order('network', { ascending: true })

  const balance = Number(shopRow?.balance ?? 0)
  const list = (addresses || []).filter((a: { currency: string }) => (a.currency || '').toUpperCase() === currency)
  if (list.length === 0) redirect('/seller/shop/wallet/topup')

  return (
    <DepositFormClient
      balance={balance}
      currency={currency}
      addresses={list}
      shopId={shop.id}
      backHref="/seller/shop/wallet/topup"
      recordHref="/seller/shop/wallet/recharge-record"
    />
  )
}
