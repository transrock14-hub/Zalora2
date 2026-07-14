import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { UserNotificationsClient } from './notifications-client'

async function getNotifications(userId: string) {
  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('userId', userId)
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
    })),
  }
}

export default async function UserNotificationsPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) return null

  const data = await getNotifications(currentUser.id)

  return <UserNotificationsClient {...data} />
}
