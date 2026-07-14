'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPrice, getStatusColor } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Shop {
  id: string
  name: string
  slug: string
  status: string
  level: string
  balance: number
  totalSales: number
  rating: number
  commissionRate: number
  logo: string | null
  user: {
    id: string
    name: string
    email: string
  }
  productCount: number
  orderCount: number
  createdAt: string
}

interface ShopsClientProps {
  shops: Shop[]
  total: number
  pages: number
  page: number
  searchParams: {
    search?: string
    status?: string
  }
}

export function ShopsClient({
  shops,
  total,
  pages,
  page,
  searchParams,
}: ShopsClientProps) {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateData, setUpdateData] = useState({
    status: '',
  })

  const handleStatusChange = (shop: Shop) => {
    setSelectedShop(shop)
    setUpdateData({ status: shop.status || 'PENDING' })
    setIsDialogOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedShop) return

    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/shops/${selectedShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updateData.status }),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update shop status')
      }

      toast.success('Shop status updated!')
      setIsDialogOpen(false)
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
          <h1 className="text-2xl font-bold font-heading">Shops & KYC</h1>
          <p className="text-muted-foreground">Review shop applications (KYC) and manage multi-vendor shops</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Icon
                  icon="solar:magnifer-linear"
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                />
                <input
                  type="text"
                  name="search"
                  placeholder="Search by name or slug..."
                  defaultValue={searchParams.search}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <select
              name="status"
              defaultValue={searchParams.status || 'all'}
              className="px-4 py-2 bg-input border border-border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CLOSED">Closed</option>
            </select>
            <Button type="submit" variant="secondary">
              <Icon icon="solar:filter-bold" className="mr-2 size-4" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {shops.length} of {total} shops</span>
      </div>

      {/* Shops List */}
      {shops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:shop-linear" className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No shops found</h3>
            <p className="text-muted-foreground">No shops match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card key={shop.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <Link href={`/admin/shops/${shop.id}`}>
                <div className="relative h-32 bg-gradient-to-r from-blue-50 to-purple-50 cursor-pointer">
                {shop.logo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <Image
                        src={shop.logo}
                        alt={shop.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
                {!shop.logo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon icon="solar:shop-bold" className="size-16 text-muted-foreground/30" />
                  </div>
                )}
                </div>
              </Link>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Link href={`/admin/shops/${shop.id}`} className="flex-1 hover:underline">
                    <h3 className="font-semibold text-lg mb-1">{shop.name}</h3>
                    <p className="text-xs text-muted-foreground">@{shop.slug}</p>
                  </Link>
                  <Badge className={getStatusColor(shop.status)}>
                    {shop.status}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-medium">{shop.user?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Products</span>
                    <span className="font-medium">{shop.productCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Orders</span>
                    <span className="font-medium">{shop.orderCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Sales</span>
                    <span className="font-medium">{shop.totalSales}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-semibold text-primary">{formatPrice(shop.balance)}</span>
                  </div>
                  {shop.rating > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rating</span>
                      <div className="flex items-center gap-1">
                        <Icon icon="solar:star-bold" className="size-4 text-yellow-500" />
                        <span className="font-medium">{shop.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/shops/${shop.id}`} className="flex-1 min-w-[120px]">
                    <Button size="sm" className="w-full">
                      <Icon icon="solar:document-text-bold" className="mr-2 size-4" />
                      Shop details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[80px]"
                    onClick={() => handleStatusChange(shop)}
                  >
                    <Icon icon="solar:settings-bold" className="mr-2 size-4" />
                    Status
                  </Button>
                  {shop.user?.id && (
                    <Link href={`/admin/users/${shop.user.id}`} className="flex-1 min-w-[80px]">
                      <Button variant="outline" size="sm" className="w-full">
                        <Icon icon="solar:user-bold" className="mr-2 size-4" />
                        Owner
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/admin/shops?page=${Math.max(1, page - 1)}`}
            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="icon">
              <Icon icon="solar:arrow-left-linear" className="size-4" />
            </Button>
          </Link>
          
          <span className="text-sm text-muted-foreground px-4">
            Page {page} of {pages}
          </span>
          
          <Link
            href={`/admin/shops?page=${Math.min(pages, page + 1)}`}
            className={page >= pages ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="icon">
              <Icon icon="solar:arrow-right-linear" className="size-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Status Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shop Status</DialogTitle>
            <DialogDescription>
              Change the status of {selectedShop?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={updateData.status || selectedShop?.status || 'PENDING'}
                onValueChange={(value) => setUpdateData({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
