'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { normalizeRealtimeMessage, normalizeApiMessage } from '@/lib/support-realtime'
import toast from 'react-hot-toast'

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
  createdAt: string
  messages: TicketMessage[]
}

interface TicketListItem {
  id: string
  ticketNumber: string
  subject: string
  status: string
  createdAt: string
  messages: Array<{ message: string; createdAt: string }>
}

function formatListTime(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** Ensures message body is always a safe string (no undefined, null, or invalid Unicode that renders as ????). */
function safeMessageText(text: unknown): string {
  if (text == null) return ''
  const s = String(text).trim()
  // Remove Unicode replacement characters (U+FFFD) that browsers can render as "????"
  const cleaned = s.replace(/\uFFFD/g, '').trim()
  return cleaned || '\u00A0' // non-breaking space so bubble has height
}

function safeFormatDateTime(date: string | undefined | null): string {
  if (date == null) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SupportClient() {
  const searchParams = useSearchParams()
  const setChatOpen = useUIStore((s) => s.setChatOpen)
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const channelsRef = useRef<Map<string, ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']>>>(new Map())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
        return data.tickets || []
      }
    } catch (e) {
      console.error('Failed to fetch tickets', e)
    }
    return []
  }

  const setupRealtimeForTickets = async (ticketList: TicketListItem[]) => {
    try {
      const supabase = createSupabaseBrowserClient()
      supabaseRef.current = supabase

      ticketList.forEach((ticket) => {
        if (channelsRef.current.has(ticket.id)) return

        const channel = supabase
          .channel(`ticket-messages:${ticket.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ticket_messages',
              filter: `ticketId=eq.${ticket.id}`,
            },
            (payload) => {
              const normalized = normalizeRealtimeMessage(payload.new as Record<string, unknown>)
              if (!normalized || normalized.ticketId !== ticket.id) return
              setSelectedTicket((prev) => {
                if (!prev || prev.id !== ticket.id) return prev
                const messageExists = prev.messages.some((m) =>
                  m.id === normalized.id ||
                  (m.id.startsWith('temp-') && m.message === normalized.message && Math.abs(new Date(m.createdAt).getTime() - new Date(normalized.createdAt).getTime()) < 5000)
                )
                if (messageExists) return prev
                const filteredMessages = prev.messages.filter((m) =>
                  !m.id.startsWith('temp-') || m.message !== normalized.message
                )
                return {
                  ...prev,
                  messages: [
                    ...filteredMessages,
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
              fetchTickets()
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
          )
          .subscribe()
        channelsRef.current.set(ticket.id, channel)
      })
    } catch (error) {
      console.error('Error setting up realtime for tickets:', error)
    }
  }

  useEffect(() => {
    const loadTickets = async () => {
      const ticketList = await fetchTickets()
      if (ticketList.length > 0) await setupRealtimeForTickets(ticketList)
      setLoading(false)
      return ticketList
    }
    loadTickets()
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
        const sortedMessages = (data.messages || []).sort(
          (a: TicketMessage, b: TicketMessage) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setSelectedTicket({ ...data, messages: sortedMessages })

        if (!channelsRef.current.has(id)) {
          if (!supabaseRef.current) supabaseRef.current = createSupabaseBrowserClient()
          const supabase = supabaseRef.current
          const channel = supabase
            .channel(`ticket-messages:${id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'ticket_messages',
                filter: `ticketId=eq.${id}`,
              },
              (payload) => {
                const normalized = normalizeRealtimeMessage(payload.new as Record<string, unknown>)
                if (!normalized || normalized.ticketId !== id) return
                setSelectedTicket((prev) => {
                  if (!prev || prev.id !== id) return prev
                  const messageExists = prev.messages.some((m) =>
                    m.id === normalized.id ||
                    (m.id.startsWith('temp-') && m.message === normalized.message && Math.abs(new Date(m.createdAt).getTime() - new Date(normalized.createdAt).getTime()) < 5000)
                  )
                  if (messageExists) return prev
                  const filteredMessages = prev.messages.filter((m) =>
                    !m.id.startsWith('temp-') || m.message !== normalized.message
                  )
                  return {
                    ...prev,
                    messages: [
                      ...filteredMessages,
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
            )
            .subscribe()
          channelsRef.current.set(id, channel)
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Failed to load ticket')
      }
    } catch (e) {
      console.error('Failed to fetch ticket', e)
      toast.error('Failed to load ticket. Please try again.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const openId = searchParams.get('open')
  useEffect(() => {
    if (!openId || loading) return
    openTicket(openId)
  }, [openId, loading])

  useEffect(() => {
    return () => {
      if (supabaseRef.current) {
        channelsRef.current.forEach((ch) => supabaseRef.current?.removeChannel(ch))
        channelsRef.current.clear()
      }
    }
  }, [])

  const handleSendReply = async () => {
    if (!selectedTicket) {
      toast.error('No ticket selected')
      return
    }
    const trimmedMessage = replyMessage.trim()
    if (!trimmedMessage) {
      toast.error('Please enter a message')
      return
    }
    if (trimmedMessage.length > 5000) {
      toast.error('Message is too long. Maximum 5000 characters allowed.')
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
            senderEmail: 'You',
            isFromAdmin: false,
            isAI: false,
            createdAt: new Date().toISOString(),
          },
        ],
      }
    })
    setReplyMessage('')
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
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
          const filteredMessages = prev.messages.filter((m) => m.id !== tempId)
          const hasReal = filteredMessages.some((m) => m.id === apiMsg.id)
          if (!hasReal) {
            filteredMessages.push({
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
            messages: filteredMessages.sort(
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
  }, [selectedTicket?.messages, selectedTicket?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  // Sort tickets by last activity (latest first)
  const sortedTickets = [...tickets].sort((a, b) => {
    const aLast = a.messages?.[0]?.createdAt ?? a.createdAt
    const bLast = b.messages?.[0]?.createdAt ?? b.createdAt
    return new Date(bLast).getTime() - new Date(aLast).getTime()
  })

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-6rem)] bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center h-14 bg-primary px-4 shadow-sm lg:hidden shrink-0">
        <Link href="/account" className="flex items-center gap-1.5 text-primary-foreground" aria-label="Back">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-semibold text-primary-foreground font-heading -ml-10">
          Support
        </h1>
        <span className="w-10" />
      </header>

      <div className="flex-1 flex min-h-0 lg:border rounded-lg overflow-hidden lg:mx-4 lg:my-4 lg:shadow-sm">
        {/* Conversation list - messaging style */}
        <aside
          className={cn(
            'flex flex-col w-full lg:w-80 lg:min-w-[280px] border-r bg-muted/30 shrink-0',
            selectedTicket ? 'hidden lg:flex' : 'flex'
          )}
        >
          <div className="p-3 border-b bg-background/80">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-base">Conversations</h2>
              <Button size="sm" onClick={() => setChatOpen(true)} className="shrink-0">
                <Icon icon="solar:add-circle-bold" className="size-4 mr-1" />
                New
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              An agent will reply shortly
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
            ) : sortedTickets.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <Icon icon="solar:chat-round-dots-linear" className="size-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground mb-4">Start a chat to get help</p>
                <Button size="sm" onClick={() => setChatOpen(true)}>
                  <Icon icon="solar:chat-round-dots-bold" className="mr-2 size-4" />
                  Start chat
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {sortedTickets.map((ticket) => {
                  const latest = Array.isArray(ticket.messages) && ticket.messages.length > 0
                    ? ticket.messages[0]
                    : null
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
                      <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Icon icon="solar:user-bold" className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate text-sm">{ticket.subject}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatListTime(latest?.createdAt ?? ticket.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {safeMessageText(latest?.message) || 'No messages yet'}
                        </p>
                        <span className={cn('inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium', getStatusColor(ticket.status))}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Thread view - messaging style */}
        <main
          className={cn(
            'flex flex-col flex-1 min-w-0 bg-background',
            !selectedTicket && 'hidden lg:flex lg:items-center lg:justify-center'
          )}
        >
          {!selectedTicket ? (
            <div className="hidden lg:flex flex-col items-center justify-center text-center p-8">
              <Icon icon="solar:chat-round-dots-linear" className="size-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Select a conversation or start a new chat</p>
              <Button className="mt-4" onClick={() => setChatOpen(true)}>
                New conversation
              </Button>
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
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon icon="solar:headphones-round-sound-bold" className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{selectedTicket.subject}</p>
                  <p className="text-xs text-muted-foreground">{selectedTicket.ticketNumber} · {selectedTicket.status}</p>
                </div>
                <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(selectedTicket.status))}>
                  {selectedTicket.status}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>
                ) : selectedTicket.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm">
                    <Icon icon="solar:chat-line-bold" className="size-10 mb-2 opacity-50" />
                    <p>No messages yet. Send a message to start the conversation.</p>
                  </div>
                ) : (
                  selectedTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2',
                        msg.isFromAdmin || msg.isAI ? 'justify-start' : 'justify-end'
                      )}
                    >
                      {msg.isFromAdmin || msg.isAI ? (
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 self-end">
                          <Icon icon="solar:user-id-bold" className="size-4 text-muted-foreground" />
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2.5',
                          msg.isFromAdmin || msg.isAI
                            ? 'rounded-bl-md bg-muted text-foreground'
                            : 'rounded-br-md bg-primary text-primary-foreground'
                        )}
                      >
                        <p className="text-[10px] opacity-80 mb-0.5">
                          {msg.isFromAdmin ? 'Support' : msg.isAI ? 'Assistant' : 'You'}
                          {' · '}
                          {safeFormatDateTime(msg.createdAt)}
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">{safeMessageText(msg.message)}</p>
                      </div>
                      {!(msg.isFromAdmin || msg.isAI) ? (
                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 self-end">
                          <Icon icon="solar:user-bold" className="size-4 text-primary" />
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply area */}
              {selectedTicket.status === 'CLOSED' ? (
                <div className="shrink-0 border-t p-4 bg-muted/30">
                  <div className="rounded-xl bg-muted p-4 text-center">
                    <Icon icon="solar:lock-password-bold" className="size-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-medium">This conversation is closed</p>
                    <p className="text-xs text-muted-foreground">Create a new chat if you need more help.</p>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t p-3 bg-background">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type a message..."
                      value={replyMessage}
                      onChange={(e) => { const v = e.target.value; if (v.length <= 5000) setReplyMessage(v) }}
                      rows={2}
                      className="resize-none min-h-[44px] max-h-32"
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
                  {replyMessage.length > 4500 && (
                    <p className="text-xs text-muted-foreground mt-1">{5000 - replyMessage.length} left</p>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
