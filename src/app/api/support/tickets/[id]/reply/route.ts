import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { notifyAdmins } from '@/lib/notifications'

const MAX_MESSAGE_LENGTH = 5000
const MIN_MESSAGE_LENGTH = 1

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { message } = body

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const trimmedMessage = message.trim()

    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Validate ticket ID
    const ticketId = params.id
    if (!ticketId || typeof ticketId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid ticket ID' },
        { status: 400 }
      )
    }

    // Get ticket info
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, userId, ticketNumber, subject, status')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Users can only reply to their own tickets
    if (ticket.userId !== session.userId) {
      return NextResponse.json(
        { error: 'You can only reply to your own tickets' },
        { status: 403 }
      )
    }

    // Don't allow replies to closed tickets (unless reopening)
    if (ticket.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot reply to closed tickets. Please create a new ticket.' },
        { status: 400 }
      )
    }

    // Get user email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', session.userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
    }

    // Create the reply message
    const { data: reply, error: replyError } = await supabaseAdmin
      .from('ticket_messages')
      .insert({
        ticketId: ticketId,
        senderId: session.userId,
        senderEmail: user?.email || 'user@example.com',
        message: trimmedMessage,
        isFromAdmin: false,
      })
      .select()
      .single()

    if (replyError) {
      console.error('Error creating reply:', replyError)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      )
    }

    // Update ticket status to IN_PROGRESS if it's RESOLVED (reopening)
    if (ticket.status === 'RESOLVED') {
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'IN_PROGRESS' })
        .eq('id', ticketId)
    }

    // Notify admins about the new user reply (non-blocking)
    notifyAdmins({
      title: 'New reply from customer',
      message: `Customer replied to ticket #${ticket.ticketNumber}: "${trimmedMessage.substring(0, 100)}${trimmedMessage.length > 100 ? '...' : ''}"`,
      type: 'support',
      link: `/admin/support/${ticketId}`,
    }).catch((notifError) => {
      console.error('Failed to notify admins:', notifError)
      // Don't fail the request if notification fails
    })

    return NextResponse.json({
      success: true,
      message: reply,
    })
  } catch (error) {
    console.error('Error sending reply:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
