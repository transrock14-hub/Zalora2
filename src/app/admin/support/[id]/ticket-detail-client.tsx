'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { normalizeRealtimeMessage } from '@/lib/support-realtime'

interface Ticket {
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
  messages: Array<{
    id: string
    message: string
    senderEmail: string | null
    isFromAdmin: boolean
    isAI: boolean
    createdAt: string
  }>
}

interface TicketDetailClientProps {
  ticket: Ticket
}

export function TicketDetailClient({ ticket: initialTicket }: TicketDetailClientProps) {
  const router = useRouter()
  const [ticket, setTicket] = useState(initialTicket)
  const [replyMessage, setReplyMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Set up real-time updates for messages
  useEffect(() => {
    const setupRealtime = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        supabaseRef.current = supabase

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
              setTicket((prev) => {
                if (!prev) return prev
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
              // Scroll to bottom when new message arrives
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 150)
            }
          )
          .subscribe()

        channelRef.current = channel
      } catch (error) {
        console.error('Error setting up realtime messages:', error)
      }
    }

    setupRealtime()

    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
      }
    }
  }, [ticket.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [ticket.messages])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200'
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
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/support/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      setTicket({ ...ticket, status: newStatus })
      toast.success('Status updated successfully')
      router.refresh()
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/support/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (!res.ok) throw new Error('Failed to update priority')

      setTicket({ ...ticket, priority: newPriority })
      toast.success('Priority updated successfully')
      router.refresh()
    } catch (error) {
      toast.error('Failed to update priority')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendReply = async () => {
    const trimmedMessage = replyMessage.trim()
    
    if (!trimmedMessage) {
      toast.error('Please enter a message')
      return
    }

    if (trimmedMessage.length > 5000) {
      toast.error('Message is too long. Maximum 5000 characters allowed.')
      return
    }

    if (isSubmitting) {
      return // Prevent duplicate submissions
    }

    setIsSubmitting(true)
    const messageToSend = trimmedMessage

    // Optimistically add message to UI immediately
    const tempId = `temp-${Date.now()}`
    setTicket((prev) => {
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
    
    // Clear input immediately
    setReplyMessage('')
    
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    try {
      const res = await fetch(`/api/admin/support/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Remove optimistic message on error
        setTicket((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages.filter((m) => m.id !== tempId),
          }
        })
        throw new Error(data.error || 'Failed to send reply')
      }

      // Replace optimistic message with real one from server
      if (data.message) {
        setTicket((prev) => {
          if (!prev) return prev
          // Remove temp message and ensure real message exists (realtime might have already added it)
          const filteredMessages = prev.messages.filter((m) => m.id !== tempId)
          const hasRealMessage = filteredMessages.some((m) => m.id === data.message.id)
          
          if (!hasRealMessage) {
            // Add real message if realtime didn't catch it yet
            filteredMessages.push({
              id: data.message.id,
              message: data.message.message,
              senderEmail: data.message.senderEmail,
              isFromAdmin: data.message.isFromAdmin,
              isAI: data.message.isAI || false,
              createdAt: data.message.createdAt,
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

      toast.success('Reply sent successfully')
      // Scroll to bottom after real message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reply. Please try again.'
      toast.error(errorMessage)
      // Restore message in input on error
      setReplyMessage(messageToSend)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/support">
          <Button variant="ghost" size="icon">
            <Icon icon="solar:arrow-left-linear" className="size-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-heading">{ticket.subject}</h1>
          <p className="text-muted-foreground">Ticket #{ticket.ticketNumber}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No messages yet. Start the conversation by sending a reply.
                </div>
              ) : (
                ticket.messages.map((message) => {
                  const fromAdmin = Boolean(message.isFromAdmin)
                  const customerLabel = ticket.user?.name || ticket.user?.email || message.senderEmail || 'Customer'
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${fromAdmin ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon
                          icon={fromAdmin ? 'solar:user-id-bold' : 'solar:user-bold'}
                          className="size-5 text-primary"
                        />
                      </div>
                      <div className={`flex-1 ${fromAdmin ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {fromAdmin ? 'You (Support)' : customerLabel}
                          </span>
                          {message.isAI && (
                            <Badge variant="outline" className="text-xs">AI</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(new Date(message.createdAt))}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            fromAdmin
                              ? 'bg-primary text-primary-foreground ml-auto inline-block'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* Reply Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send Reply</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your reply... (Press Enter to send, Shift+Enter for new line)"
                value={replyMessage}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.length <= 5000) {
                    setReplyMessage(value)
                  }
                }}
                rows={4}
                className="resize-none"
                maxLength={5000}
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isSubmitting) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
              />
              {replyMessage.length > 4500 && (
                <p className="text-xs text-muted-foreground">
                  {5000 - replyMessage.length} characters remaining
                </p>
              )}
              <Button onClick={handleSendReply} disabled={isSubmitting || !replyMessage.trim()}>
                {isSubmitting ? (
                  <>
                    <Icon icon="solar:loading-circle-bold" className="mr-2 size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:plain-2-bold" className="mr-2 size-4" />
                    Send Reply
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {ticket.user?.avatar ? (
                    <img
                      src={ticket.user.avatar}
                      alt={ticket.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon icon="solar:user-bold" className="size-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{ticket.user?.name || 'Guest'}</p>
                  <p className="text-sm text-muted-foreground">{ticket.user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={ticket.status} onValueChange={handleStatusChange} disabled={isUpdating}>
                  <SelectTrigger>
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

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={ticket.priority} onValueChange={handlePriorityChange} disabled={isUpdating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDateTime(new Date(ticket.createdAt))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDateTime(new Date(ticket.updatedAt))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
