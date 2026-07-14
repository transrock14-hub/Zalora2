import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { InvitationCodesClient } from './invitation-codes-client'

export const dynamic = 'force-dynamic'

export default async function InvitationCodesPage() {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    redirect('/admin/login')
  }

  return <InvitationCodesClient />
}
