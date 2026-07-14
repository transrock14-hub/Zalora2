import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createNotification, createNotificationsForUsers, createBroadcastNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { userIds, broadcast, title, message, type, link } = body

    if (!title || !message || !type) {
      return NextResponse.json(
        { error: 'title, message, and type are required' },
        { status: 400 }
      )
    }

    let notifications

    if (broadcast) {
      // Broadcast to all users
      notifications = await createBroadcastNotification({
        title,
        message,
        type,
        link: link || null,
      })
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Send to specific users
      notifications = await createNotificationsForUsers(userIds, {
        title,
        message,
        type,
        link: link || null,
      })
    } else {
      return NextResponse.json(
        { error: 'Either userIds array or broadcast=true is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error creating notifications:', error)
    return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 })
  }
}
