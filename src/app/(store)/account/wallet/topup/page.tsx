import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { RechargeMethodsClient } from './recharge-methods-client'

export const dynamic = 'force-dynamic'

export default async function TopUpPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const { data: addresses } = await supabaseAdmin
    .from('crypto_addresses')
    .select('id, currency, address, network, label, qrCode')
    .eq('isActive', true)
    .is('shopId', null)
    .order('currency', { ascending: true })

  return <RechargeMethodsClient addresses={addresses || []} />
}
