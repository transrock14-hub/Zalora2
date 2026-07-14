'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    slug: string
    images: Array<{
      id: string
      url: string
    }>
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  total: number
  subtotal: number
  tax: number
  shippingCost: number
  shippingAddress: string
  createdAt: Date
  items: OrderItem[]
}

interface OrderDetailsClientProps {
  order: Order
}

export function OrderDetailsClient({ order }: OrderDetailsClientProps) {
  const { t } = useLanguage()

  const statusColors: Record<string, string> = {
    PENDING_PAYMENT: 'bg-yellow-500',
    PAYMENT_CONFIRMING: 'bg-blue-500',
    PAID: 'bg-green-500',
    PROCESSING: 'bg-blue-500',
    SHIPPED: 'bg-purple-500',
    DELIVERED: 'bg-green-500',
    COMPLETED: 'bg-green-600',
    CANCELLED: 'bg-red-500',
    REFUNDED: 'bg-orange-500',
  }

  const paymentStatusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500',
    CONFIRMING: 'bg-blue-500',
    COMPLETED: 'bg-green-500',
    FAILED: 'bg-red-500',
    EXPIRED: 'bg-gray-500',
    REFUNDED: 'bg-orange-500',
  }

  let shippingAddress
  try {
    const parsed = JSON.parse(order.shippingAddress)
    shippingAddress = parsed.shippingAddress || parsed
  } catch {
    shippingAddress = {}
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <div className="bg-primary px-4 pt-4 pb-6 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/account/orders" className="text-white">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-white text-lg font-bold font-heading">Order Details</h1>
          <div className="size-6" />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/account/orders" className="text-muted-foreground hover:text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-2xl font-bold font-heading">Order Details</h1>
        </div>
      </div>

      <div className="flex-1 px-4 lg:container lg:mx-auto">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info Card */}
            <div className="bg-card rounded-xl p-6 border border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold mb-1">Order #{order.orderNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={statusColors[order.status]}>
                    {order.status}
                  </Badge>
                  <Badge className={paymentStatusColors[order.paymentStatus]}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-sm text-muted-foreground">Order Items</h4>
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                    <div className="size-20 rounded bg-muted overflow-hidden flex-shrink-0">
                      <Image
                        src={item.product.images[0]?.url || '/placeholder.png'}
                        alt={item.product.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="text-sm font-medium hover:text-primary line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        Qty: {item.quantity}
                      </p>
                      <p className="text-sm font-bold text-primary mt-1">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-card rounded-xl p-6 border border-border/50">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Icon icon="solar:map-point-bold" className="size-5" />
                Shipping Address
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{shippingAddress.fullName}</p>
                {shippingAddress.phone && <p>{shippingAddress.phone}</p>}
                {shippingAddress.email && <p>{shippingAddress.email}</p>}
                {shippingAddress.address && <p>{shippingAddress.address}</p>}
                {(shippingAddress.city || shippingAddress.state || shippingAddress.zipCode) && (
                  <p>
                    {[shippingAddress.city, shippingAddress.state, shippingAddress.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {shippingAddress.country && <p>{shippingAddress.country}</p>}
                {shippingAddress.notes && (
                  <p className="text-muted-foreground mt-2">
                    <strong>Note:</strong> {shippingAddress.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-card rounded-xl p-6 border border-border/50">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Icon icon="solar:card-bold" className="size-5" />
                Payment Method
              </h3>
              <p className="text-sm font-medium">
                {order.paymentMethod === 'BANK_TRANSFER' && 'Credit / Debit Card'}
                {(order.paymentMethod === 'USDT_TRC20' || order.paymentMethod === 'USDT_ERC20') && 'USDT (Cryptocurrency)'}
                {order.paymentMethod === 'BTC' && 'Bitcoin (BTC)'}
                {order.paymentMethod === 'ETH' && 'Ethereum (ETH)'}
                {order.paymentMethod === 'CASH_ON_DELIVERY' && 'Cash on Delivery'}
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-6 lg:mt-0">
            <div className="bg-card rounded-xl p-6 border border-border/50 sticky top-24">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('shipping')}</span>
                  <span>{order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('tax')}</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>{t('total')}</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button asChild className="w-full" variant="outline">
                  <Link href="/account/orders">
                    <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
                    {t('back')} to {t('myOrders')}
                  </Link>
                </Button>
                {order.status === 'DELIVERED' && (
                  <Button asChild className="w-full">
                    <Link href={`/account/orders/${order.id}/review`}>
                      <Icon icon="solar:star-bold" className="mr-2 size-4" />
                      Write Review
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
