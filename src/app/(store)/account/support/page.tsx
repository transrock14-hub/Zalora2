import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { SupportClient } from './support-client'

export default async function SupportPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?redirect=/account/support')
  return <SupportClient />
}
