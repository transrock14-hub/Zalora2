import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('userId', session.userId)

    if (unreadOnly) {
      query = query.eq('isRead', false)
    }

    const [notificationsResult, unreadCountResult] = await Promise.all([
      query.order('createdAt', { ascending: false }).limit(limit),
      supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('userId', session.userId)
        .eq('isRead', false),
    ])

    if (notificationsResult.error) {
      throw notificationsResult.error
    }

    return NextResponse.json({
      notifications: (notificationsResult.data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount: unreadCountResult.count || 0,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create notifications for other users
    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, title, message, type, link } = body

    if (!userId || !title || !message || !type) {
      return NextResponse.json(
        { error: 'userId, title, message, and type are required' },
        { status: 400 }
      )
    }

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        userId,
        title,
        message,
        type,
        link: link || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
