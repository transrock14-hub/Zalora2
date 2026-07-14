import { getCurrentUser } from '@/lib/auth'
import { RechargeRecordClient } from './recharge-record-client'

export const dynamic = 'force-dynamic'

export default async function RechargeRecordPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null
  return <RechargeRecordClient />
}
