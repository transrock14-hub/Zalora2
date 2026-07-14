import { SessionGate } from '@/components/session-gate'

export const dynamic = 'force-dynamic'

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SessionGate>{children}</SessionGate>
}
