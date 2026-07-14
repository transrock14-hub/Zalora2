'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatPrice, getStatusColor, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface UserPreferences {
  orderUpdates?: boolean
  promotions?: boolean
  newsletter?: boolean
  [key: string]: unknown
}

interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  phone: string | null
  role: string
  status: string
  balance: number
  canSell: boolean
  emailVerified: string | null
  preferences?: UserPreferences
  lastLoginAt: string | null
  lastLoginIp: string | null
  createdAt: string
  orderCount: number
  addressCount: number
  reviewCount: number
  favoriteCount: number
}

interface Shop {
  id: string
  name: string
  slug: string
  status: string
  level: string
  balance: number
  rating: number
  productCount: number
  orderCount: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: string
}

interface UserDetailsClientProps {
  user: User
  shop: Shop | null
  recentOrders: Order[]
}

export function UserDetailsClient({
  user: initialUser,
  shop,
  recentOrders,
}: UserDetailsClientProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [savingControls, setSavingControls] = useState(false)
  const [canSell, setCanSell] = useState(initialUser.canSell)
  const [prefs, setPrefs] = useState({
    orderUpdates: initialUser.preferences?.orderUpdates !== false,
    promotions: initialUser.preferences?.promotions !== false,
    newsletter: initialUser.preferences?.newsletter === true,
  })
  const [editData, setEditData] = useState({
    name: initialUser.name,
    email: initialUser.email,
    phone: initialUser.phone || '',
    role: initialUser.role,
    status: initialUser.status,
    balance: initialUser.balance.toString(),
    canSell: initialUser.canSell,
  })

  const handleSaveControls = async () => {
    setSavingControls(true)
    try {
      const res = await fetch(`/api/admin/users/${initialUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canSell,
          preferences: {
            orderUpdates: prefs.orderUpdates,
            promotions: prefs.promotions,
            newsletter: prefs.newsletter,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update controls')
      toast.success('User controls updated')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingControls(false)
    }
  }

  const handleUpdateUser = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/users/${initialUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
          phone: editData.phone || null,
          role: editData.role,
          status: editData.status,
          balance: parseFloat(editData.balance),
          canSell: editData.canSell,
        }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      toast.success('User updated successfully!')
      setIsEditDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">User Details</h1>
          <p className="text-muted-foreground">{initialUser.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditData({
                name: initialUser.name,
                email: initialUser.email,
                phone: initialUser.phone || '',
                role: initialUser.role,
                status: initialUser.status,
                balance: initialUser.balance.toString(),
                canSell: initialUser.canSell,
              })
              setIsEditDialogOpen(true)
            }}
          >
            <Icon icon="solar:pen-bold" className="mr-2 size-4" />
            Edit User
          </Button>
          <Link href="/admin/users">
            <Button variant="outline">
              <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
              Back to Users
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-muted flex-shrink-0">
                  {initialUser.avatar ? (
                    <Image
                      src={initialUser.avatar}
                      alt={initialUser.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
                      <span className="text-white font-bold text-2xl">
                        {initialUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{initialUser.name}</h2>
                    <Badge className={getStatusColor(initialUser.status)}>
                      {initialUser.status}
                    </Badge>
                    <Badge variant="outline">{initialUser.role}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">{initialUser.email}</p>
                  {initialUser.phone && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <Icon icon="solar:phone-bold" className="inline mr-2 size-4" />
                      {initialUser.phone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Balance</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(initialUser.balance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Orders</p>
                <p className="text-2xl font-bold">{initialUser.orderCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Reviews</p>
                <p className="text-2xl font-bold">{initialUser.reviewCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Favorites</p>
                <p className="text-2xl font-bold">{initialUser.favoriteCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Shop Information */}
          {shop && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shop Information</CardTitle>
                  <Link href={`/admin/shops/${shop.id}`}>
                    <Button variant="outline" size="sm">
                      View Shop
                      <Icon icon="solar:alt-arrow-right-linear" className="ml-2 size-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shop Name</span>
                    <span className="font-medium">{shop.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(shop.status)}>{shop.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level</span>
                    <Badge variant="outline">{shop.level}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium">{formatPrice(shop.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <Icon icon="solar:star-bold" className="size-4 text-yellow-500" />
                      <span className="font-medium">{shop.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Products</span>
                    <span className="font-medium">{shop.productCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders</span>
                    <span className="font-medium">{shop.orderCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <Link href={`/admin/orders?user=${initialUser.id}`}>
                    <Button variant="outline" size="sm">
                      View All
                      <Icon icon="solar:alt-arrow-right-linear" className="ml-2 size-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(order.total)}</p>
                        <Badge className={getStatusColor(order.status)} variant="outline">
                          {order.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{initialUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email Verified</span>
                <Badge variant={initialUser.emailVerified ? 'default' : 'secondary'}>
                  {initialUser.emailVerified ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Can Sell</span>
                <Badge variant={initialUser.canSell ? 'default' : 'secondary'}>
                  {initialUser.canSell ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Addresses</span>
                <span className="font-medium">{initialUser.addressCount}</span>
              </div>
              {initialUser.lastLoginAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Login</span>
                  <span>{formatDateTime(initialUser.lastLoginAt)}</span>
                </div>
              )}
              {initialUser.lastLoginIp && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last IP</span>
                  <span className="font-mono text-xs">{initialUser.lastLoginIp}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDateTime(initialUser.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notifications & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications & Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Order update emails</Label>
                  <p className="text-xs text-muted-foreground">Receipts & status changes</p>
                </div>
                <Switch
                  checked={prefs.orderUpdates}
                  onCheckedChange={(c) => setPrefs((p) => ({ ...p, orderUpdates: c }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Promotions</Label>
                  <p className="text-xs text-muted-foreground">Marketing offers & deals</p>
                </div>
                <Switch
                  checked={prefs.promotions}
                  onCheckedChange={(c) => setPrefs((p) => ({ ...p, promotions: c }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Newsletter</Label>
                  <p className="text-xs text-muted-foreground">Periodic updates</p>
                </div>
                <Switch
                  checked={prefs.newsletter}
                  onCheckedChange={(c) => setPrefs((p) => ({ ...p, newsletter: c }))}
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="space-y-0.5">
                  <Label>Can sell</Label>
                  <p className="text-xs text-muted-foreground">Allow creating a shop</p>
                </div>
                <Switch checked={canSell} onCheckedChange={setCanSell} />
              </div>
              <Button
                className="w-full"
                onClick={handleSaveControls}
                loading={savingControls}
              >
                <Icon icon="solar:diskette-bold" className="mr-2 size-4" />
                Save Controls
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {initialUser.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editData.role}
                  onValueChange={(value) => setEditData({ ...editData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="BANNED">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="balance">Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                min="0"
                value={editData.balance}
                onChange={(e) => setEditData({ ...editData, balance: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="canSell">Can Sell</Label>
              <input
                id="canSell"
                type="checkbox"
                checked={editData.canSell}
                onChange={(e) => setEditData({ ...editData, canSell: e.target.checked })}
                className="size-4"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
