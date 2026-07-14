import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { AdminNotificationsClient } from './notifications-client'

export const dynamic = 'force-dynamic'

async function getNotifications() {
  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select(`
      *,
      user:users!notifications_userId_fkey (
        id,
        name,
        email
      )
    `)
    .order('createdAt', { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  return {
    notifications: (notifications || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt,
      user: {
        id: n.user.id,
        name: n.user.name,
        email: n.user.email,
      },
    })),
  }
}

export default async function AdminNotificationsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) return null

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
    redirect('/')
  }

  const data = await getNotifications()
  return <AdminNotificationsClient {...data} />
}
