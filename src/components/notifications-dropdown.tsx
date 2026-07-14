'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useLanguage } from '@/contexts/language-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  isRead: boolean
  createdAt: string
}

interface NotificationsDropdownProps {
  variant?: 'admin' | 'user'
}

const typeIcons: Record<string, string> = {
  order: 'solar:box-bold',
  payment: 'solar:wallet-bold',
  promo: 'solar:gift-bold',
  system: 'solar:bell-bold',
  support: 'solar:chat-round-call-bold',
}

const typeColors: Record<string, string> = {
  order: 'text-blue-600',
  payment: 'text-green-600',
  promo: 'text-purple-600',
  system: 'text-gray-600',
  support: 'text-orange-600',
}

export function NotificationsDropdown({ variant = 'user' }: NotificationsDropdownProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>['channel']> | null>(null)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=10&unreadOnly=false', {
        credentials: 'include',
      })
      const data = await res.json()

      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
      // 401 is expected when the server fails to read the session (e.g. serverless cold start).
      // Do not treat as logout; AuthSync no longer clears user on failed /api/auth/me.
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Set up Supabase Realtime for live notifications
    let fallbackIntervalId: ReturnType<typeof setInterval> | null = null
    
    const setupRealtime = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        supabaseRef.current = supabase

        // Get current user ID from session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.id) {
          console.log('No session found, skipping realtime setup')
          // Fallback to polling if no session
          fallbackIntervalId = setInterval(fetchNotifications, 30000)
          return
        }

        const userId = session.user.id

        // Subscribe to notifications for this user
        const channel = supabase
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `userId=eq.${userId}`,
            },
            (payload) => {
              const newNotification = payload.new as Notification
              setNotifications((prev) => [newNotification, ...prev])
              setUnreadCount((prev) => prev + 1)
              
              // Show toast for new notification
              toast.success(
                newNotification.message 
                  ? `${newNotification.title}: ${newNotification.message}`
                  : newNotification.title,
                {
                  duration: 5000,
                }
              )
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `userId=eq.${userId}`,
            },
            (payload) => {
              const updatedNotification = payload.new as Notification
              setNotifications((prev) =>
                prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
              )
              // Update unread count if notification was marked as read
              if (updatedNotification.isRead) {
                setUnreadCount((prev) => Math.max(0, prev - 1))
              }
            }
          )
          .subscribe()

        channelRef.current = channel
      } catch (error) {
        console.error('Error setting up realtime notifications:', error)
        // Fallback to polling if realtime fails
        fallbackIntervalId = setInterval(fetchNotifications, 30000)
      }
    }

    setupRealtime()

    // Fallback polling for when page is hidden (realtime may disconnect)
    const POLL_HIDDEN_MS = 120000
    let intervalId: ReturnType<typeof setInterval> | null = null

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Start polling when hidden
        intervalId = setInterval(fetchNotifications, POLL_HIDDEN_MS)
      } else {
        // Stop polling when visible (realtime handles it)
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
        fetchNotifications() // Refresh immediately when visible
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', fetchNotifications)
    const onRefresh = () => fetchNotifications()
    window.addEventListener('notifications-refresh', onRefresh)

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (fallbackIntervalId) clearInterval(fallbackIntervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', fetchNotifications)
      window.removeEventListener('notifications-refresh', onRefresh)
      
      // Cleanup realtime subscription
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
        credentials: 'include',
      })

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
        toast.success('All notifications marked as read')
      }
    } catch (error) {
      toast.error(t('failedToMarkAllAsRead'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        const notification = notifications.find((n) => n.id === id)
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      setOpen(false)
    }
  }

  const notificationsPath = variant === 'admin' ? '/admin/notifications' : '/account/notifications'

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icon icon="solar:bell-bing-linear" className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 size-2 bg-destructive rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="h-7 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">
            <Icon icon="solar:bell-off-linear" className="size-8 mx-auto mb-2 opacity-30" />
            <p>No notifications</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault()
                  handleNotificationClick(notification)
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  <Icon
                    icon={typeIcons[notification.type] || 'solar:bell-bold'}
                    className={`size-5 mt-0.5 flex-shrink-0 ${
                      typeColors[notification.type] || 'text-gray-600'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium ${
                          !notification.isRead ? 'font-semibold' : ''
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="size-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 h-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(notification.id)
                    }}
                  >
                    <Icon icon="solar:trash-bin-trash-bold" className="size-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={notificationsPath} className="w-full text-center">
                {t('viewAllNotifications')}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
