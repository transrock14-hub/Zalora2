/**
 * Normalize realtime payload from Supabase postgres_changes.
 * Handles both camelCase (JS client) and snake_case (Postgres) column names.
 */
export interface NormalizedTicketMessage {
  id: string
  ticketId: string
  message: string
  senderEmail: string | null
  isFromAdmin: boolean
  isAI: boolean
  createdAt: string
}

export function normalizeRealtimeMessage(raw: Record<string, unknown> | null): NormalizedTicketMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = (r.id ?? r.Id) as string | undefined
  const ticketId = (r.ticketId ?? r.ticket_id ?? r.ticketid) as string | undefined
  const message = (r.message ?? r.Message) as string | undefined
  const senderEmail = (r.senderEmail ?? r.sender_email ?? r.senderemail) as string | null | undefined
  const isFromAdmin = Boolean(r.isFromAdmin ?? r.is_from_admin ?? r.isfromadmin ?? false)
  const isAI = Boolean(r.isAI ?? r.is_ai ?? r.isai ?? false)
  const createdAt = (r.createdAt ?? r.created_at ?? r.createdat) as string | undefined
  if (!id || !ticketId || message === undefined || !createdAt) return null
  return {
    id: String(id),
    ticketId: String(ticketId),
    message: String(message),
    senderEmail: senderEmail != null ? String(senderEmail) : null,
    isFromAdmin,
    isAI,
    createdAt: String(createdAt),
  }
}

/** Normalize message from API reply response (handles camelCase/snake_case). */
export function normalizeApiMessage(raw: Record<string, unknown> | null): NormalizedTicketMessage | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = (r.id ?? r.Id) as string | undefined
  const message = (r.message ?? r.Message) as string | undefined
  const senderEmail = (r.senderEmail ?? r.sender_email ?? r.senderemail) as string | null | undefined
  const isFromAdmin = Boolean(r.isFromAdmin ?? r.is_from_admin ?? r.isfromadmin ?? false)
  const isAI = Boolean(r.isAI ?? r.is_ai ?? r.isai ?? false)
  const createdAt = (r.createdAt ?? r.created_at ?? r.createdat) as string | undefined
  if (!id || message === undefined || !createdAt) return null
  return {
    id: String(id),
    ticketId: '',
    message: String(message),
    senderEmail: senderEmail != null ? String(senderEmail) : null,
    isFromAdmin,
    isAI,
    createdAt: String(createdAt),
  }
}
