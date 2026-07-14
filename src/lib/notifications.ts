import { supabaseAdmin } from './supabase'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type: 'order' | 'payment' | 'promo' | 'system' | 'support'
  link?: string | null
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    const notifications = userIds.map((userId) => ({
      userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || null,
    }))

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error creating notifications:', error)
    throw error
  }
}

/**
 * Create notification for all users (broadcast)
 */
export async function createBroadcastNotification(
  params: Omit<CreateNotificationParams, 'userId'>
) {
  try {
    // Get all user IDs
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')

    if (!users || users.length === 0) {
      return []
    }

    const notifications = users.map((user) => ({
      userId: user.id,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || null,
    }))

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error creating broadcast notification:', error)
    throw error
  }
}

/**
 * Notify all admin and manager users (e.g. when new support ticket is created)
 */
export async function notifyAdmins(params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('role', ['ADMIN', 'MANAGER'])

    if (!admins || admins.length === 0) {
      return []
    }

    const notifications = admins.map((user) => ({
      userId: user.id,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || null,
    }))

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error notifying admins:', error)
    throw error
  }
}
