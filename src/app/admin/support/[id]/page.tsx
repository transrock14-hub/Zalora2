import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { TicketDetailClient } from './ticket-detail-client'

async function getTicket(id: string) {
  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      *,
      user:users!support_tickets_userId_fkey (
        id,
        name,
        email,
        avatar
      ),
      messages:ticket_messages (
        *
      )
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return null
  }

  // Normalize messages (camelCase + snake_case) and sort by createdAt
  type NormMsg = {
    id: string
    message: string
    senderEmail: string | null
    isFromAdmin: boolean
    isAI: boolean
    createdAt: string
  }
  const rawMessages = Array.isArray(ticket.messages) ? ticket.messages : []
  const messages = rawMessages
    .map((msg: Record<string, unknown>) => ({
      id: String(msg.id ?? msg.Id ?? ''),
      message: String(msg.message ?? msg.Message ?? ''),
      senderEmail:
        msg.senderEmail != null || msg.sender_email != null || msg.senderemail != null
          ? String(msg.senderEmail ?? msg.sender_email ?? msg.senderemail)
          : null,
      isFromAdmin: Boolean(msg.isFromAdmin ?? msg.is_from_admin ?? msg.isfromadmin ?? false),
      isAI: Boolean(msg.isAI ?? msg.is_ai ?? msg.isai ?? false),
      createdAt: String(msg.createdAt ?? msg.created_at ?? msg.createdat ?? ''),
    }))
    .filter((m: NormMsg) => m.id && m.createdAt)
    .sort((a: NormMsg, b: NormMsg) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    user: ticket.user
      ? {
          id: ticket.user.id,
          name: ticket.user.name,
          email: ticket.user.email,
          avatar: ticket.user.avatar,
        }
      : null,
    messages,
  }
}

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ticket = await getTicket(params.id)

  if (!ticket) {
    notFound()
  }

  return <TicketDetailClient ticket={ticket} />
}
