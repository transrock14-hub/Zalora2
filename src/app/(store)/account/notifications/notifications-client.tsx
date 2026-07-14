'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useLanguage } from '@/contexts/language-context'
import type { TranslationKey } from '@/lib/translations'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  isRead: boolean
  createdAt: string
}

interface UserNotificationsClientProps {
  notifications: Notification[]
}

const typeIcons: Record<string, string> = {
  order: 'solar:box-bold',
  payment: 'solar:wallet-bold',
  promo: 'solar:gift-bold',
  system: 'solar:bell-bold',
  support: 'solar:chat-round-call-bold',
}

const typeColors: Record<string, string> = {
  order: 'bg-blue-100 text-blue-800',
  payment: 'bg-green-100 text-green-800',
  promo: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800',
  support: 'bg-orange-100 text-orange-800',
}

export function UserNotificationsClient({
  notifications: initialNotifications,
}: UserNotificationsClientProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread' | string>('all')

  const filteredNotifications =
    filter === 'all'
      ? notifications
      : filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications.filter((n) => n.type === filter)

  const unreadCount = notifications.filter((n) => !n.isRead).length

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
      }
    } catch (error) {
      toast.error('Failed to mark as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        toast.success(t('allNotificationsMarkedAsRead'))
      }
    } catch (error) {
      toast.error('Failed to mark all as read')
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
        toast.success(t('notificationDeleted'))
      }
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const typeCounts = {
    all: notifications.length,
    unread: unreadCount,
    order: notifications.filter((n) => n.type === 'order').length,
    payment: notifications.filter((n) => n.type === 'payment').length,
    promo: notifications.filter((n) => n.type === 'promo').length,
    system: notifications.filter((n) => n.type === 'system').length,
    support: notifications.filter((n) => n.type === 'support').length,
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">{t('notifications')}</h1>
          <p className="text-muted-foreground">{t('yourNotifications')}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Icon icon="solar:check-read-bold" className="mr-2 size-4" />
            {t('markAllRead')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all', labelKey: 'all' as TranslationKey },
              { key: 'unread', labelKey: 'unread' as TranslationKey },
              { key: 'order', labelKey: 'orders' as TranslationKey },
              { key: 'payment', labelKey: 'payments' as TranslationKey },
              { key: 'promo', labelKey: 'promotions' as TranslationKey },
              { key: 'system', labelKey: 'system' as TranslationKey },
              { key: 'support', labelKey: 'support' as TranslationKey },
            ] as const).map((item) => (
              <Button
                key={item.key}
                variant={filter === item.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(item.key)}
              >
                {t(item.labelKey)}
                {typeCounts[item.key as keyof typeof typeCounts] > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {typeCounts[item.key as keyof typeof typeCounts]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:bell-off-linear" className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-muted-foreground">No notifications match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors ${
                !notification.isRead ? 'border-primary/50 bg-primary/5' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      typeColors[notification.type] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <Icon
                      icon={typeIcons[notification.type] || 'solar:bell-bold'}
                      className="size-5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-medium ${
                              !notification.isRead ? 'font-semibold' : ''
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="size-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={typeColors[notification.type] || ''}
                      >
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                          >
                            <Icon icon="solar:check-read-bold" className="mr-1 size-3" />
                            {t('markRead')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(notification.id)
                          }}
                        >
                          <Icon icon="solar:trash-bin-trash-bold" className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
