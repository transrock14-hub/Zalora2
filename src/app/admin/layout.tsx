import { AdminAuthGate } from '@/components/admin/admin-auth-gate'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminAuthGate>{children}</AdminAuthGate>
}
