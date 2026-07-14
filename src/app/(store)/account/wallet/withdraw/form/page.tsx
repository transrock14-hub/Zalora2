import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { WithdrawFormClient } from './withdraw-form-client'

export const dynamic = 'force-dynamic'

const METHOD_MAP: Record<string, { currency: string; network: string }> = {
  'usdt-erc20': { currency: 'USDT', network: 'ERC-20' },
  'usdt-trc20': { currency: 'USDT', network: 'TRC-20' },
  eth: { currency: 'ETH', network: 'ERC-20' },
  btc: { currency: 'BTC', network: 'BTC' },
  bank: { currency: 'BANK', network: 'Online Banking' },
}

export default async function WithdrawFormPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const { method: methodId } = await searchParams
  const method = methodId ? METHOD_MAP[methodId.toLowerCase()] : null
  if (!method) redirect('/account/wallet/withdraw')

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('id', currentUser.id)
    .single()

  const balance = Number(user?.balance ?? 0)

  return (
    <WithdrawFormClient
      balance={balance}
      currency={method.currency}
      network={method.network}
      methodId={methodId ?? ''}
    />
  )
}
