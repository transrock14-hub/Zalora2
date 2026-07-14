import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { notifyAdmins } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subject, message, email, priority = 'MEDIUM' } = body

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      )
    }

    // Try to get authenticated user
    const session = await getSession()
    let userId = session?.userId || null
    let userEmail = email

    // If no authenticated user, require email
    if (!userId && !userEmail) {
      return NextResponse.json(
        { error: 'Email is required for guest tickets' },
        { status: 400 }
      )
    }

    // If authenticated, get user email
    if (userId) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      if (user) {
        userEmail = user.email
      }
    }

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Create support ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        ticketNumber,
        userId,
        subject,
        priority,
        status: 'OPEN',
      })
      .select()
      .single()

    if (ticketError || !ticket) {
      throw ticketError || new Error('Failed to create ticket')
    }

    // Create initial message
    const { error: messageError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticketId: ticket.id,
        message,
        senderEmail: userEmail,
        isFromAdmin: false,
      })

    if (messageError) {
      // Rollback ticket if message creation fails
      await supabaseAdmin.from('support_tickets').delete().eq('id', ticket.id)
      throw messageError
    }

    // Notify all admins about the new support ticket
    try {
      await notifyAdmins({
        title: 'New support ticket',
        message: `Ticket #${ticket.ticketNumber}: ${ticket.subject}`,
        type: 'support',
        link: `/admin/support/${ticket.id}`,
      })
    } catch (notifyErr) {
      console.error('Failed to notify admins:', notifyErr)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
      },
    })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, role } = session

    // Build query based on role
    let query = supabaseAdmin
      .from('support_tickets')
      .select(`
        *,
        user:users!support_tickets_userId_fkey (
          name,
          email,
          avatar
        ),
        messages:ticket_messages (
          *
        )
      `)

    // Admins can see all tickets, users see only their own
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      query = query.eq('userId', userId)
    }

    let result = await query.order('createdAt', { ascending: false })
    if (result.error) {
      const fallback = await query.order('createdat', { ascending: false })
      if (fallback.error) throw fallback.error
      result = fallback
    }
    const tickets = (result.data || []) as Record<string, unknown>[]

    const getCreatedAt = (obj: Record<string, unknown>) =>
      String(obj?.createdAt ?? obj?.createdat ?? obj?.created_at ?? '')

    const formattedTickets = tickets.map((ticket) => {
      const rawMessages = (ticket.messages as Record<string, unknown>[]) || []
      const messages = rawMessages
        .map((m) => ({ ...m, createdAt: getCreatedAt(m) }))
        .sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime())
      return {
        ...ticket,
        messages,
      }
    })

    return NextResponse.json({ tickets: formattedTickets })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}
