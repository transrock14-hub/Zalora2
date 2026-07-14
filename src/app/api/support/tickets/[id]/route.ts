import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.role === 'ADMIN' || session.role === 'MANAGER'
    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .select(
        isAdmin
          ? `
        *,
        user:users!support_tickets_userId_fkey (
          id,
          name,
          email,
          avatar
        ),
        messages:ticket_messages (
          id,
          message,
          senderEmail,
          isFromAdmin,
          isAI,
          createdAt
        )
      `
          : `
        *,
        messages:ticket_messages (
          id,
          message,
          senderEmail,
          isFromAdmin,
          isAI,
          createdAt
        )
      `
      )
      .eq('id', params.id)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const row = ticket as unknown as {
      id: string
      userId?: string | null
      ticketNumber: string
      subject: string
      status: string
      priority?: string
      createdAt: string
      updatedAt?: string
      user?: { id: string; name: string; email: string; avatar: string | null } | null
      messages?: Array<{ id: string; message: string; senderEmail: string | null; isFromAdmin: boolean; isAI?: boolean; createdAt: string }>
    }
    if (!isAdmin && row.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawMessages = Array.isArray(row.messages) ? row.messages : []
    const messages = rawMessages
      .map((msg: Record<string, unknown>) => ({
        id: String(msg.id ?? msg.Id ?? ''),
        message: String(msg.message ?? msg.Message ?? ''),
        senderEmail: msg.senderEmail != null || msg.sender_email != null || msg.senderemail != null ? String(msg.senderEmail ?? msg.sender_email ?? msg.senderemail) : null,
        isFromAdmin: Boolean(msg.isFromAdmin ?? msg.is_from_admin ?? msg.isfromadmin ?? false),
        isAI: Boolean(msg.isAI ?? msg.is_ai ?? msg.isai ?? false),
        createdAt: String(msg.createdAt ?? msg.created_at ?? msg.createdat ?? ''),
      }))
      .filter((m) => m.id && m.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const base: Record<string, unknown> = {
      id: row.id,
      ticketNumber: row.ticketNumber,
      subject: row.subject,
      status: row.status,
      priority: row.priority || 'MEDIUM',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || row.createdAt,
      messages,
    }
    if (isAdmin && row.user) {
      base.user = {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        avatar: row.user.avatar,
      }
    }
    return NextResponse.json(base)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}
