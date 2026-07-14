import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { DepositFormClient } from './deposit-form-client'

export const dynamic = 'force-dynamic'

export default async function DepositPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const { currency: currencyParam } = await searchParams
  const currency = (currencyParam || '').toUpperCase().trim()
  if (!currency) redirect('/account/wallet/topup')

  const [{ data: user }, { data: addresses }] = await Promise.all([
    supabaseAdmin.from('users').select('balance').eq('id', currentUser.id).single(),
    supabaseAdmin
      .from('crypto_addresses')
      .select('id, currency, address, network, label, qrCode')
      .eq('isActive', true)
      .is('shopId', null)
      .ilike('currency', currency)
      .order('network', { ascending: true }),
  ])

  const balance = Number(user?.balance ?? 0)
  const list = (addresses || []).filter((a: { currency: string }) => (a.currency || '').toUpperCase() === currency)
  if (list.length === 0) redirect('/account/wallet/topup')

  return (
    <DepositFormClient
      balance={balance}
      currency={currency}
      addresses={list}
    />
  )
}
