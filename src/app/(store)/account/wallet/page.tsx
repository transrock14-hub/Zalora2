import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { WalletClient } from './wallet-client'

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('balance')
    .eq('id', currentUser.id)
    .single()

  const balance = Number(user?.balance ?? 0)
  return <WalletClient balance={balance} />
}
