import { SessionGate } from '@/components/session-gate'

export const dynamic = 'force-dynamic'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionGate>{children}</SessionGate>
}
