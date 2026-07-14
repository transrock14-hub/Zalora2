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
import { Textarea } from '@/components/ui/textarea'
import { formatPrice, getStatusColor, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Shop {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  banner: string | null
  status: string
  level: string
  balance: number
  totalSales: number
  rating: number
  commissionRate: number
  createdAt: string
  memberSince: string | null
  productCount: number
  orderCount: number
  followersCount: number
}

interface Owner {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  status: string
  balance: number
  canSell: boolean
  createdAt: string
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  status: string
  image: string | null
  categoryName: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  userName: string
  createdAt: string
}

interface Verification {
  id: string
  status: string
  contactName: string
  idNumber: string
  inviteCode: string | null
  idCardFront: string | null
  idCardBack: string | null
  mainBusiness: string | null
  detailedAddress: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

interface AdminShopDetailsClientProps {
  shop: Shop
  owner: Owner
  products: Product[]
  recentOrders: Order[]
  verification: Verification | null
}

export function AdminShopDetailsClient({
  shop: initialShop,
  owner,
  products,
  recentOrders,
  verification,
}: AdminShopDetailsClientProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isKycUpdating, setIsKycUpdating] = useState(false)
  const [editData, setEditData] = useState({
    name: initialShop.name,
    slug: initialShop.slug,
    description: initialShop.description || '',
    status: initialShop.status,
    level: initialShop.level,
    balance: initialShop.balance.toString(),
    rating: initialShop.rating.toString(),
    commissionRate: initialShop.commissionRate.toString(),
    followersCount: initialShop.followersCount.toString(),
    totalSales: initialShop.totalSales.toString(),
    orderCount: initialShop.orderCount.toString(),
    memberSince: initialShop.memberSince ?? '',
  })

  const handleApproveKyc = async () => {
    if (!verification) return
    setIsKycUpdating(true)
    try {
      const res = await fetch(`/api/admin/shops/${initialShop.id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve KYC')
      toast.success('KYC approved. Shop is now active and seller has access.')
      window.location.reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve KYC')
    } finally {
      setIsKycUpdating(false)
    }
  }

  const handleRejectKyc = async () => {
    if (!verification) return
    setIsKycUpdating(true)
    try {
      const res = await fetch(`/api/admin/shops/${initialShop.id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectReason.trim() || 'Application rejected.',
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject KYC')
      toast.success('KYC rejected. Applicant can reapply after addressing the reason.')
      setIsRejectDialogOpen(false)
      setRejectReason('')
      window.location.reload()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject KYC')
    } finally {
      setIsKycUpdating(false)
    }
  }

  const handleEditShop = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/shops/${initialShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          slug: editData.slug,
          description: editData.description,
          status: editData.status,
          level: editData.level,
          balance: parseFloat(editData.balance),
          rating: parseFloat(editData.rating),
          commissionRate: parseFloat(editData.commissionRate),
          followers: parseInt(editData.followersCount),
          totalSales: parseInt(editData.totalSales),
          memberSince: editData.memberSince?.trim() ? `${editData.memberSince.trim()}T00:00:00.000Z` : null,
        }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update shop')
      }

      toast.success('Shop updated successfully!')
      setIsEditDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/shops"
            className="rounded-lg p-2 border border-border bg-card hover:bg-muted/50 transition-colors"
            aria-label="Back to Shops"
          >
            <Icon icon="solar:arrow-left-linear" className="size-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{initialShop.name}</h1>
            <p className="text-sm text-muted-foreground">@{initialShop.slug}</p>
          </div>
          <Badge className={getStatusColor(initialShop.status)}>{initialShop.status}</Badge>
        </div>
        <Link href="/admin/shops">
          <Button variant="outline" size="sm">
            <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
            Back to Shops
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shop hero card */}
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="relative h-44 sm:h-52 bg-gradient-to-br from-primary/10 via-primary/5 to-muted overflow-hidden">
              {initialShop.banner ? (
                <Image
                  src={initialShop.banner}
                  alt={initialShop.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              {initialShop.logo && (
                <div className="absolute bottom-4 left-4 flex items-end gap-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-background shadow-lg bg-card">
                    <Image
                      src={initialShop.logo}
                      alt={initialShop.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="pb-1">
                    <h2 className="text-lg font-semibold text-foreground drop-shadow-sm">{initialShop.name}</h2>
                    <p className="text-sm text-muted-foreground">@{initialShop.slug}</p>
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-6">
              {!initialShop.logo && (
                <div className="mb-3">
                  <h2 className="text-lg font-semibold">{initialShop.name}</h2>
                  <p className="text-sm text-muted-foreground">@{initialShop.slug}</p>
                </div>
              )}
              {initialShop.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{initialShop.description}</p>
              )}
            </CardContent>
          </Card>

          {/* KYC Verification – dedicated card */}
          {verification && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon icon="solar:shield-check-bold" className="size-5 text-primary" />
                    KYC Verification
                  </CardTitle>
                  <Badge
                    className={
                      verification.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : verification.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }
                  >
                    {verification.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {formatDateTime(verification.createdAt)}
                  {verification.reviewedAt && (
                    <span> · Reviewed {formatDateTime(verification.reviewedAt)}</span>
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Submitted KYC details */}
                <div className="rounded-xl bg-muted/30 border border-border/60 p-5 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted details</p>
                  <dl className="grid gap-3 text-sm">
                    <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                      <dt className="text-muted-foreground">Contact name</dt>
                      <dd className="font-medium text-right">{verification.contactName}</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                      <dt className="text-muted-foreground">ID number</dt>
                      <dd className="font-mono font-medium text-right">{verification.idNumber}</dd>
                    </div>
                    {verification.mainBusiness && (
                      <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                        <dt className="text-muted-foreground">Main business</dt>
                        <dd className="font-medium text-right">{verification.mainBusiness}</dd>
                      </div>
                    )}
                    {verification.detailedAddress && (
                      <div className="py-2">
                        <dt className="text-muted-foreground text-sm mb-1">Detailed address</dt>
                        <dd className="font-medium text-sm whitespace-pre-wrap mt-1">{verification.detailedAddress}</dd>
                      </div>
                    )}
                    {verification.inviteCode && (
                      <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                        <dt className="text-muted-foreground">Invite code</dt>
                        <dd className="font-medium text-right">{verification.inviteCode}</dd>
                      </div>
                    )}
                  </dl>
                  {(verification.idCardFront || verification.idCardBack) && (
                    <div className="pt-4 border-t border-border/60">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">ID document</p>
                      <div className="grid grid-cols-2 gap-4">
                        {verification.idCardFront && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Front</p>
                            <a
                              href={verification.idCardFront}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full relative aspect-[1.6] rounded-lg border border-border overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                            >
                              <Image src={verification.idCardFront} alt="ID front" fill className="object-contain" sizes="220px" />
                            </a>
                          </div>
                        )}
                        {verification.idCardBack && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Back</p>
                            <a
                              href={verification.idCardBack}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full relative aspect-[1.6] rounded-lg border border-border overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                            >
                              <Image src={verification.idCardBack} alt="ID back" fill className="object-contain" sizes="220px" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {verification.status === 'REJECTED' && verification.rejectionReason && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
                    <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">Rejection reason</p>
                    <p className="text-sm text-red-700 dark:text-red-300">{verification.rejectionReason}</p>
                  </div>
                )}

                {verification.status === 'PENDING' && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      size="sm"
                      onClick={handleApproveKyc}
                      disabled={isKycUpdating}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isKycUpdating ? 'Updating...' : 'Approve KYC'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsRejectDialogOpen(true)}
                      disabled={isKycUpdating}
                    >
                      Reject KYC
                    </Button>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Approve to activate the shop and grant seller access. Reject to send a reason; the applicant can reapply.
                    </p>
                  </div>
                )}

                {verification.status !== 'PENDING' && (
                  <p className="text-xs text-muted-foreground">
                    To change shop status or KYC, use Edit Shop Details in the sidebar.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shop Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Products', value: initialShop.productCount, icon: 'solar:box-bold' },
              { label: 'Orders', value: initialShop.orderCount, icon: 'solar:bill-list-bold' },
              { label: 'Total Sales', value: initialShop.totalSales, icon: 'solar:chart-2-bold' },
              { label: 'Followers', value: initialShop.followersCount, icon: 'solar:users-group-rounded-bold' },
              { label: 'Balance', value: formatPrice(owner.balance), icon: 'solar:wallet-bold', primary: true },
            ].map(({ label, value, icon, primary }) => (
              <Card key={label} className="border-border/80 shadow-sm hover:shadow transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Icon icon={icon} className="size-4" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                  <p className={`text-xl font-bold tabular-nums ${primary ? 'text-primary' : ''}`}>
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Products */}
          {products.length > 0 && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon icon="solar:box-bold" className="size-4 text-muted-foreground" />
                    Recent Products
                  </CardTitle>
                  <Link href={`/admin/products?shop=${initialShop.id}`}>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      View all
                      <Icon icon="solar:alt-arrow-right-linear" className="ml-1 size-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/admin/products/${product.id}`}
                      className="group rounded-lg border border-border/60 p-3 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                    >
                      <div className="aspect-square relative bg-muted/50 rounded-md overflow-hidden mb-2">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="120px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon icon="solar:box-linear" className="size-8 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium line-clamp-2">{product.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(product.price)}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon icon="solar:bill-list-bold" className="size-4 text-muted-foreground" />
                    Recent Orders
                  </CardTitle>
                  <Link href={`/admin/orders?shop=${initialShop.id}`}>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      View all
                      <Icon icon="solar:alt-arrow-right-linear" className="ml-1 size-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/30 hover:border-border transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.userName} · {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-semibold text-sm">{formatPrice(order.total)}</p>
                        <Badge className={`${getStatusColor(order.status)} text-[10px]`} variant="outline">
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
          {/* Owner */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon icon="solar:user-bold" className="size-4 text-muted-foreground" />
                Shop Owner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {owner.avatar ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                    <Image src={owner.avatar} alt={owner.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon icon="solar:user-bold" className="size-6 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{owner.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
                </div>
              </div>
              <dl className="grid gap-2 text-sm py-3 border-y border-border/60">
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd><Badge variant="outline" className="font-normal">{owner.role}</Badge></dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><Badge className={getStatusColor(owner.status)}>{owner.status}</Badge></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Account Balance</dt>
                  <dd className="font-medium">{formatPrice(owner.balance)}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Can sell</dt>
                  <dd><Badge variant={owner.canSell ? 'default' : 'secondary'}>{owner.canSell ? 'Yes' : 'No'}</Badge></dd>
                </div>
              </dl>
              <Link href={`/admin/users/${owner.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Icon icon="solar:user-bold" className="mr-2 size-4" />
                  View profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Shop Settings */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon icon="solar:settings-bold" className="size-4 text-muted-foreground" />
                Shop Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-2 text-sm py-2">
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><Badge className={getStatusColor(initialShop.status)}>{initialShop.status}</Badge></dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Level</dt>
                  <dd><Badge variant="outline">{initialShop.level}</Badge></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Account Balance</dt>
                  <dd className="font-medium">{formatPrice(owner.balance)}</dd>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Same wallet as Shop Owner — order charges, delivery payouts, and refunds update both.
                </p>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Rating</dt>
                  <dd className="flex items-center gap-1">
                    <Icon icon="solar:star-bold" className="size-4 text-amber-500" />
                    <span className="font-medium">{initialShop.rating.toFixed(1)}</span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Commission</dt>
                  <dd className="font-medium">{initialShop.commissionRate}%</dd>
                </div>
              </dl>

              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => {
                  setEditData({
                    name: initialShop.name,
                    slug: initialShop.slug,
                    description: initialShop.description || '',
                    status: initialShop.status,
                    level: initialShop.level,
                    balance: owner.balance.toString(),
                    rating: initialShop.rating.toString(),
                    commissionRate: initialShop.commissionRate.toString(),
                    followersCount: initialShop.followersCount.toString(),
                    totalSales: initialShop.totalSales.toString(),
                    orderCount: initialShop.orderCount.toString(),
                    memberSince: initialShop.memberSince ?? '',
                  })
                  setIsEditDialogOpen(true)
                }}
              >
                <Icon icon="solar:pen-bold" className="mr-2 size-4" />
                Edit shop details
              </Button>

              <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground">
                Created {formatDateTime(initialShop.createdAt)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Shop Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shop Details</DialogTitle>
            <DialogDescription>
              Update all shop information for {initialShop.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Shop Name *</Label>
              <Input
                id="name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">Shop Slug *</Label>
              <Input
                id="slug"
                value={editData.slug}
                onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="level">Shop Level</Label>
                <Select
                  value={editData.level}
                  onValueChange={(value) => setEditData({ ...editData, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRONZE">Bronze</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                    <SelectItem value="PLATINUM">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="balance">Account Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editData.balance}
                  onChange={(e) => setEditData({ ...editData, balance: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="rating">Store Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={editData.rating}
                  onChange={(e) => setEditData({ ...editData, rating: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="commissionRate">Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={editData.commissionRate}
                onChange={(e) => setEditData({ ...editData, commissionRate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of each sale that goes to the platform
              </p>
            </div>

            <div>
              <Label htmlFor="followersCount">Followers Count</Label>
              <Input
                id="followersCount"
                type="number"
                min="0"
                value={editData.followersCount}
                onChange={(e) => setEditData({ ...editData, followersCount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of followers for this shop
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalSales">Total Sales</Label>
                <Input
                  id="totalSales"
                  type="number"
                  min="0"
                  value={editData.totalSales}
                  onChange={(e) => setEditData({ ...editData, totalSales: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Total sales amount (will update when user views shop)
                </p>
              </div>

              <div>
                <Label htmlFor="orderCount">Order Count (Read-only)</Label>
                <Input
                  id="orderCount"
                  type="number"
                  value={editData.orderCount}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Calculated from actual orders
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="memberSince">Member since</Label>
              <Input
                id="memberSince"
                type="date"
                value={editData.memberSince}
                onChange={(e) => setEditData({ ...editData, memberSince: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Date shown as &quot;Member since&quot; on the public shop page. Leave empty to use shop creation date.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button onClick={handleEditShop} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Shop'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject KYC dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The applicant will see this and can reapply after addressing it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejectReason">Reason (required)</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. ID document unclear, address mismatch..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectKyc}
              disabled={isKycUpdating || !rejectReason.trim()}
            >
              {isKycUpdating ? 'Rejecting...' : 'Reject KYC'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
