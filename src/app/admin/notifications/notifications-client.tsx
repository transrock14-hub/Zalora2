'use client'

import { useState } from 'react'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  isRead: boolean
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface AdminNotificationsClientProps {
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

export function AdminNotificationsClient({
  notifications: initialNotifications,
}: AdminNotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread' | string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
        toast.success('All notifications marked as read')
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
        toast.success('Notification deleted')
      }
    } catch (error) {
      toast.error('Failed to delete notification')
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
          <h1 className="text-2xl font-bold font-heading">Notifications</h1>
          <p className="text-muted-foreground">Manage all user notifications</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
            Send Notification
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <Icon icon="solar:check-read-bold" className="mr-2 size-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'order', label: 'Orders' },
              { key: 'payment', label: 'Payments' },
              { key: 'promo', label: 'Promotions' },
              { key: 'system', label: 'System' },
              { key: 'support', label: 'Support' },
            ].map((item) => (
              <Button
                key={item.key}
                variant={filter === item.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(item.key)}
              >
                {item.label}
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
              className={!notification.isRead ? 'border-primary/50 bg-primary/5' : ''}
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
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.user.name} ({notification.user.email})
                        </p>
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
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Icon icon="solar:check-read-bold" className="mr-1 size-3" />
                            Mark Read
                          </Button>
                        )}
                        {notification.link && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={notification.link} target="_blank" rel="noopener noreferrer">
                              <Icon icon="solar:arrow-right-linear" className="mr-1 size-3" />
                              View
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
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

      {/* Create Notification Dialog */}
      <CreateNotificationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false)
          window.location.reload()
        }}
      />
    </div>
  )
}

function CreateNotificationDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    userIds: '',
    broadcast: false,
    title: '',
    message: '',
    type: 'system' as 'order' | 'payment' | 'promo' | 'system' | 'support',
    link: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        link: formData.link || null,
      }

      if (formData.broadcast) {
        payload.broadcast = true
      } else if (formData.userIds.trim()) {
        payload.userIds = formData.userIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      } else {
        toast.error('Please provide user IDs or enable broadcast')
        return
      }

      const res = await fetch('/api/admin/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create notification')
      }

      toast.success(`Notification sent to ${data.count} user(s)`)
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
          <DialogDescription>
            Create and send notifications to users
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="broadcast"
              checked={formData.broadcast}
              onChange={(e) =>
                setFormData({ ...formData, broadcast: e.target.checked })
              }
              className="size-4"
            />
            <Label htmlFor="broadcast">Broadcast to all users</Label>
          </div>

          {!formData.broadcast && (
            <div>
              <Label htmlFor="userIds">User IDs (comma-separated)</Label>
              <Input
                id="userIds"
                value={formData.userIds}
                onChange={(e) => setFormData({ ...formData, userIds: e.target.value })}
                placeholder="user1, user2, user3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter user IDs separated by commas
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="promo">Promotion</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="link">Link (optional)</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="/account/orders/123"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
