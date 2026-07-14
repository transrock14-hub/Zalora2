'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { normalizeRealtimeMessage, normalizeApiMessage } from '@/lib/support-realtime'

interface TicketMessage {
  id: string
  message: string
  senderEmail: string | null
  isFromAdmin: boolean
  isAI: boolean
  createdAt: string
}

interface TicketDetail {
  id: string
  ticketNumber: string
  subject: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  } | null
  messages: TicketMessage[]
}

interface TicketListItem {
  id: string
  ticketNumber: string
  subject: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  user: {
    name: string
    email: string
    avatar: string | null
  } | null
  messages: Array<{ message: string; senderEmail: string | null; createdAt: string }>
}

function formatListTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function normalizeListTicket(t: any): TicketListItem {
  const messages = Array.isArray(t.messages) ? t.messages : []
  const sorted = [...messages].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    status: t.status,
    priority: t.priority || 'MEDIUM',
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    user: t.user ? { name: t.user.name, email: t.user.email, avatar: t.user.avatar } : null,
    messages: sorted,
  }
}

export function SupportTicketsClient() {
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const channelTicketsRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null>(null)
  const channelMessagesRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedTicketIdRef = useRef<string | null>(null)
  selectedTicketIdRef.current = selectedTicket?.id ?? null

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const list = (data.tickets || []).map(normalizeListTicket)
        setTickets(list)
        return list
      }
    } catch (e) {
      console.error('Failed to fetch tickets', e)
      toast.error('Failed to load tickets')
    }
    return []
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const list = await fetchTickets()
      if (cancelled) return
      setLoading(false)
      if (!supabaseRef.current) {
        const supabase = createSupabaseBrowserClient()
        supabaseRef.current = supabase
        channelTicketsRef.current = supabase
          .channel('admin-support-tickets')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'support_tickets' },
            () => fetchTickets()
          )
          .subscribe()
        channelMessagesRef.current = supabase
          .channel('admin-support-messages')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'ticket_messages' },
            (payload) => {
              const normalized = normalizeRealtimeMessage(payload.new as Record<string, unknown>)
              if (!normalized) return
              const ticketId = normalized.ticketId
              setTickets((prev) => {
                const ticket = prev.find((t) => t.id === ticketId)
                if (!ticket) return prev
                const newMsg = {
                  message: normalized.message,
                  senderEmail: normalized.senderEmail,
                  createdAt: normalized.createdAt,
                }
                const next = prev.map((t) =>
                  t.id === ticketId
                    ? { ...t, messages: [newMsg, ...t.messages], updatedAt: normalized.createdAt }
                    : t
                )
                return next.sort((a, b) => {
                  const aLast = a.messages[0]?.createdAt ?? a.updatedAt ?? a.createdAt
                  const bLast = b.messages[0]?.createdAt ?? b.updatedAt ?? b.createdAt
                  return new Date(bLast).getTime() - new Date(aLast).getTime()
                })
              })
              if (selectedTicketIdRef.current === ticketId) {
                setSelectedTicket((prev) => {
                  if (!prev) return prev
                  const exists = prev.messages.some((m) => m.id === normalized.id)
                  if (exists) return prev
                  return {
                    ...prev,
                    messages: [
                      ...prev.messages,
                      {
                        id: normalized.id,
                        message: normalized.message,
                        senderEmail: normalized.senderEmail,
                        isFromAdmin: normalized.isFromAdmin,
                        isAI: normalized.isAI,
                        createdAt: normalized.createdAt,
                      },
                    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
                  }
                })
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
              }
            }
          )
          .subscribe()
      }
    }
    load()
    return () => {
      cancelled = true
      if (channelTicketsRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelTicketsRef.current)
        channelTicketsRef.current = null
      }
      if (channelMessagesRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelMessagesRef.current)
        channelMessagesRef.current = null
      }
    }
  }, [])

  const openTicket = async (id: string) => {
    if (loadingDetail) return
    setLoadingDetail(true)
    setSelectedTicket(null)
    setReplyMessage('')
    try {
      const res = await fetch(`/api/support/tickets/${id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const raw = Array.isArray(data.messages) ? data.messages : []
        type MsgRow = {
          id: string
          message: string
          senderEmail: string | null
          isFromAdmin: boolean
          isAI: boolean
          createdAt: string
        }
        const messages = raw
          .map((m: Record<string, unknown>) => ({
            id: String(m.id ?? m.Id ?? ''),
            message: String(m.message ?? m.Message ?? ''),
            senderEmail:
              m.senderEmail != null || m.sender_email != null || m.senderemail != null
                ? String(m.senderEmail ?? m.sender_email ?? m.senderemail)
                : null,
            isFromAdmin: Boolean(m.isFromAdmin ?? m.is_from_admin ?? m.isfromadmin ?? false),
            isAI: Boolean(m.isAI ?? m.is_ai ?? m.isai ?? false),
            createdAt: String(m.createdAt ?? m.created_at ?? m.createdat ?? ''),
          }))
          .filter((m: MsgRow) => m.id && m.createdAt)
          .sort((a: MsgRow, b: MsgRow) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        setSelectedTicket({
          id: data.id,
          ticketNumber: data.ticketNumber,
          subject: data.subject,
          status: data.status,
          priority: (data as any).priority || 'MEDIUM',
          createdAt: data.createdAt,
          updatedAt: (data as any).updatedAt || data.createdAt,
          user: (data as any).user ?? null,
          messages,
        })
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to load ticket')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load ticket')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null))
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      )
      toast.success('Status updated')
      setIsUpdating(false)
    } catch {
      toast.error('Failed to update status')
      setIsUpdating(false)
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicket) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to update priority')
      setSelectedTicket((prev) => (prev ? { ...prev, priority: newPriority } : null))
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, priority: newPriority } : t))
      )
      toast.success('Priority updated')
      setIsUpdating(false)
    } catch {
      toast.error('Failed to update priority')
      setIsUpdating(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket) return
    const trimmedMessage = replyMessage.trim()
    if (!trimmedMessage) {
      toast.error('Please enter a message')
      return
    }
    if (trimmedMessage.length > 5000) {
      toast.error('Message is too long (max 5000 characters)')
      return
    }
    if (isSubmitting) return

    setIsSubmitting(true)
    const messageToSend = trimmedMessage
    const tempId = `temp-${Date.now()}`

    setSelectedTicket((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: tempId,
            message: messageToSend,
            senderEmail: 'Admin',
            isFromAdmin: true,
            isAI: false,
            createdAt: new Date().toISOString(),
          },
        ],
      }
    })
    setReplyMessage('')
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend }),
        credentials: 'include',
      })
      const data = await res.json()

      if (!res.ok) {
        setSelectedTicket((prev) =>
          prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) } : null
        )
        throw new Error(data.error || 'Failed to send reply')
      }

      const apiMsg = normalizeApiMessage(data.message as Record<string, unknown>)
      if (apiMsg) {
        setSelectedTicket((prev) => {
          if (!prev) return prev
          const filtered = prev.messages.filter((m) => m.id !== tempId)
          const hasReal = filtered.some((m) => m.id === apiMsg.id)
          if (!hasReal) {
            filtered.push({
              id: apiMsg.id,
              message: apiMsg.message,
              senderEmail: apiMsg.senderEmail,
              isFromAdmin: apiMsg.isFromAdmin,
              isAI: apiMsg.isAI,
              createdAt: apiMsg.createdAt,
            })
          }
          return {
            ...prev,
            messages: filtered.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            ),
          }
        })
      }
      toast.success('Reply sent')
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reply')
      setReplyMessage(messageToSend)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (selectedTicket && messagesEndRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [selectedTicket?.messages?.length, selectedTicket?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-emerald-200'
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-800 dark:text-blue-400 border-blue-200'
      case 'RESOLVED':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredTickets = tickets.filter((t) => (filter === 'all' ? true : t.status === filter))
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const aLast = a.messages[0]?.createdAt ?? a.updatedAt ?? a.createdAt
    const bLast = b.messages[0]?.createdAt ?? b.updatedAt ?? b.createdAt
    return new Date(bLast).getTime() - new Date(aLast).getTime()
  })

  const statusCounts = {
    all: tickets.length,
    OPEN: tickets.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter((t) => t.status === 'CLOSED').length,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-0 pb-20 lg:pb-0">
      <div className="flex-1 flex min-h-0 border rounded-lg overflow-hidden bg-card shadow-sm">
        {/* Conversation list */}
        <aside
          className={cn(
            'flex flex-col w-full lg:w-96 lg:min-w-[320px] border-r bg-muted/20 shrink-0',
            selectedTicket ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="p-4 border-b bg-background">
            <h1 className="text-xl font-bold font-heading">Support</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Realtime conversations</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {(['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {f === 'all' ? 'All' : f.replace('_', ' ')} ({statusCounts[f] ?? 0})
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            ) : sortedTickets.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Icon icon="solar:chat-round-dots-linear" className="size-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tickets {filter !== 'all' ? `with status ${filter}` : ''}</p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedTickets.map((ticket) => {
                  const lastMsg = ticket.messages[0]
                  const isSelected = selectedTicket?.id === ticket.id
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => openTicket(ticket.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/60 transition-colors',
                        isSelected && 'bg-primary/10 border-l-2 border-l-primary'
                      )}
                    >
                      <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {ticket.user?.avatar ? (
                          <img src={ticket.user.avatar} alt="" className="size-full object-cover" />
                        ) : (
                          <Icon icon="solar:user-bold" className="size-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate text-sm">{ticket.subject}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatListTime(lastMsg?.createdAt ?? ticket.updatedAt ?? ticket.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {ticket.user?.name || ticket.user?.email || 'Guest'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lastMsg?.message ?? 'No messages'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getStatusColor(ticket.status))}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getPriorityColor(ticket.priority))}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Thread view */}
        <main className={cn('flex flex-col flex-1 min-w-0 bg-background', !selectedTicket && 'hidden lg:flex lg:items-center lg:justify-center')}>
          {!selectedTicket ? (
            <div className="hidden lg:flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <Icon icon="solar:chat-round-dots-linear" className="size-16 mb-4 opacity-30" />
              <p>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => { setSelectedTicket(null); setReplyMessage('') }}
                >
                  <Icon icon="solar:arrow-left-linear" className="size-5" />
                </Button>
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {selectedTicket.user?.avatar ? (
                    <img src={selectedTicket.user.avatar} alt="" className="size-full object-cover" />
                  ) : (
                    <Icon icon="solar:user-bold" className="size-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{selectedTicket.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedTicket.user?.name || selectedTicket.user?.email || 'Guest'} · #{selectedTicket.ticketNumber}
                  </p>
                </div>
                <Badge variant="outline" className={getStatusColor(selectedTicket.status)}>
                  {selectedTicket.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(selectedTicket.priority)}>
                  {selectedTicket.priority}
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>
                ) : selectedTicket.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm">
                    <Icon icon="solar:chat-line-bold" className="size-10 mb-2 opacity-50" />
                    <p>No messages yet. Send a reply to start.</p>
                  </div>
                ) : (
                  selectedTicket.messages.map((msg) => {
                    const fromAdmin = Boolean(msg.isFromAdmin)
                    const customerLabel = selectedTicket.user?.name || selectedTicket.user?.email || msg.senderEmail || 'Customer'
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2',
                          fromAdmin ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {!fromAdmin && (
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 self-end" title={customerLabel}>
                            <Icon icon="solar:user-bold" className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-4 py-2.5',
                            fromAdmin
                              ? 'rounded-br-md bg-primary text-primary-foreground'
                              : 'rounded-bl-md bg-muted text-foreground'
                          )}
                        >
                          <p className="text-[10px] opacity-80 mb-0.5">
                            {fromAdmin ? 'You (Support)' : customerLabel}
                            {msg.isAI && ' (AI)'}
                            {' · '}
                            {formatDateTime(msg.createdAt)}
                          </p>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                        {fromAdmin && (
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 self-end">
                            <Icon icon="solar:user-id-bold" className="size-4 text-primary" />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply + sidebar */}
              <div className="shrink-0 border-t p-4 bg-muted/20 flex flex-col lg:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                  <Textarea
                    placeholder="Type a reply... (Enter to send)"
                    value={replyMessage}
                    onChange={(e) => { const v = e.target.value; if (v.length <= 5000) setReplyMessage(v) }}
                    rows={2}
                    className="resize-none min-h-[44px] max-h-28"
                    maxLength={5000}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isSubmitting) {
                        e.preventDefault()
                        handleSendReply()
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="shrink-0 h-11 w-11"
                    onClick={handleSendReply}
                    disabled={isSubmitting || !replyMessage.trim()}
                  >
                    {isSubmitting ? (
                      <Icon icon="solar:loading-circle-bold" className="size-5 animate-spin" />
                    ) : (
                      <Icon icon="solar:plain-2-bold" className="size-5" />
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Select value={selectedTicket.status} onValueChange={handleStatusChange} disabled={isUpdating}>
                      <SelectTrigger className="w-[130px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Priority</span>
                    <Select value={selectedTicket.priority} onValueChange={handlePriorityChange} disabled={isUpdating}>
                      <SelectTrigger className="w-[110px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
