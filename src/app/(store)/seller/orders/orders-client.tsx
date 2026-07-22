'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, getStatusColor, formatDateTime } from '@/lib/utils'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  costPrice: number | null
  image: string | null
  lumpSum: number
  wholesaleTotal: number | null
  profit: number | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: Date
  userName: string
  userEmail: string
  items: OrderItem[]
}

interface SellerOrdersClientProps {
  orders: Order[]
  total: number
  pages: number
  page: number
  searchParams: {
    status?: string
  }
}

export function SellerOrdersClient({
  orders,
  total,
  pages,
  page,
  searchParams,
}: SellerOrdersClientProps) {
  const statusParam = searchParams?.status
  const statusValue = Array.isArray(statusParam) ? statusParam[0] : statusParam

  const tabs = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'completed', label: 'Completed' },
    { value: 'refunds', label: 'Refunds' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center h-14 bg-primary px-4 shadow-sm">
        <Link href="/account" className="flex items-center gap-1.5 text-primary-foreground text-sm font-medium lg:hidden">
          <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
          <span>Back</span>
        </Link>
        <h1 className="flex-1 text-center text-lg font-semibold text-primary-foreground font-heading">Store Orders</h1>
        <span className="w-14 lg:w-0" />
      </header>
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div className="hidden lg:flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading">Store Orders</h1>
            <p className="text-muted-foreground text-sm">Orders received by your shop</p>
          </div>
          <Link href="/account" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-5" />
            <span>Back</span>
          </Link>
        </div>

        {/* Status tabs: Pending, In Transit, Completed, Refunds */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Link
            href="/seller/orders"
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              !statusValue || statusValue === 'all'
                ? 'bg-primary/10 text-primary border-primary'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            }`}
          >
            All
          </Link>
          {tabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/seller/orders?status=${tab.value}`}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                statusValue === tab.value
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {orders.length} of {total} orders</span>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:bill-list-linear" className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-muted-foreground">Orders for your products will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <Link href={`/seller/orders/${order.id}`} className="font-semibold hover:text-primary">
                    #{order.orderNumber}
                  </Link>
                  <Badge className={getStatusColor(order.status)} variant="outline">
                    {order.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-4 border-b border-border/50 last:border-0">
                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon icon="solar:box-linear" className="size-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="mt-1 space-y-0.5 text-xs text-destructive font-medium">
                        <p>lump sum: {formatPrice(item.lumpSum)} ×{item.quantity}</p>
                        {item.profit != null && (
                          <p>Sales Profit: {formatPrice(item.profit)} ×{item.quantity}</p>
                        )}
                        {item.wholesaleTotal != null && (
                          <p>Wholesale Price: {formatPrice(item.wholesaleTotal)} ×{item.quantity}</p>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold text-destructive">
                        Actual payment:{' '}
                        {formatPrice(item.wholesaleTotal != null ? item.wholesaleTotal : item.lumpSum)}
                      </p>
                      {['DELIVERED', 'COMPLETED'].includes(order.status) &&
                        item.wholesaleTotal != null && (
                          <p className="mt-2 text-[11px] leading-snug text-muted-foreground font-normal">
                            Balance: −{formatPrice(item.wholesaleTotal)} when processed, then +
                            {formatPrice(item.lumpSum)} lump sum when delivered (net +
                            {formatPrice(item.profit ?? item.lumpSum - item.wholesaleTotal)}).
                          </p>
                        )}
                      {['SHIPPED', 'PROCESSING', 'PAID'].includes(order.status) &&
                        item.wholesaleTotal != null && (
                          <p className="mt-2 text-[11px] leading-snug text-muted-foreground font-normal">
                            On delivery you receive the lump sum ({formatPrice(item.lumpSum)} = wholesale +
                            profit).
                          </p>
                        )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  <Link href={`/seller/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <Icon icon="solar:alt-arrow-right-linear" className="ml-2 size-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Link
              href={`/seller/orders?page=${Math.max(1, page - 1)}${statusValue ? `&status=${statusValue}` : ''}`}
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
              href={`/seller/orders?page=${Math.min(pages, page + 1)}${statusValue ? `&status=${statusValue}` : ''}`}
              className={page >= pages ? 'pointer-events-none opacity-50' : ''}
            >
              <Button variant="outline" size="icon">
                <Icon icon="solar:arrow-right-linear" className="size-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
