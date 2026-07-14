import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { WithdrawFormClient } from '@/app/(store)/account/wallet/withdraw/form/withdraw-form-client'

export const dynamic = 'force-dynamic'

const METHOD_MAP: Record<string, { currency: string; network: string }> = {
  'usdt-erc20': { currency: 'USDT', network: 'ERC-20' },
  'usdt-trc20': { currency: 'USDT', network: 'TRC-20' },
  eth: { currency: 'ETH', network: 'ERC-20' },
  btc: { currency: 'BTC', network: 'BTC' },
  bank: { currency: 'BANK', network: 'Online Banking' },
}

export default async function SellerShopWithdrawFormPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null
  const { shop } = await getSellerShopAccess(user.id)
  if (!shop) redirect('/seller/create-shop')

  const { method: methodId } = await searchParams
  const method = methodId ? METHOD_MAP[methodId.toLowerCase()] : null
  if (!method) redirect('/seller/shop/wallet/withdraw')

  const { data: shopRow } = await supabaseAdmin
    .from('shops')
    .select('balance')
    .eq('id', shop.id)
    .single()

  const balance = Number(shopRow?.balance ?? 0)

  return (
    <WithdrawFormClient
      balance={balance}
      currency={method.currency}
      network={method.network}
      methodId={methodId!}
      shopId={shop.id}
      backHref="/seller/shop/wallet/withdraw"
      recordHref="/seller/shop/wallet/withdrawal-record"
    />
  )
}
