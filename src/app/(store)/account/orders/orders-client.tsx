'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatDateTime, getStatusColor } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: Date
  items: {
    id: string
    quantity: number
    price: number
    product: {
      name: string
      slug: string
      images: { url: string }[]
    }
  }[]
}

export function OrdersClient({ orders }: { orders: Order[] }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          {t('myOrders')}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold font-heading">{t('myOrders')}</h1>
            <p className="text-muted-foreground mt-2">{t('trackAndManageYourOrders')}</p>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon icon="solar:box-linear" className="size-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('noOrdersYet')}</h3>
                <p className="text-muted-foreground mb-4">{t('startShoppingToSeeOrders')}</p>
                <Link
                  href="/products"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  {t('browseProducts')}
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                      <div>
                        <p className="font-medium">{t('orderNumber')} #{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(order.paymentStatus)}>
                          {order.paymentStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="relative size-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={item.product.images[0]?.url || '/placeholder-product.jpg'}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <Link href={`/products/${item.product.slug}`} className="text-sm font-medium hover:text-primary line-clamp-2">
                              {item.product.name}
                            </Link>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                              <span className="text-sm font-medium">{formatPrice(item.price)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Total */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <span className="text-sm text-muted-foreground">{t('total')}</span>
                      <span className="text-lg font-bold">{formatPrice(order.total)}</span>
                    </div>

                    {/* View details */}
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="mt-4 flex items-center justify-center gap-1 w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                    >
                      View Details
                      <Icon icon="solar:arrow-right-linear" className="size-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
