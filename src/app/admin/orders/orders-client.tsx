'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPrice, formatDateTime, getStatusColor, copyToClipboard } from '@/lib/utils'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  variant: string | null
  image: string | null
  product: {
    name: string
    slug: string
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
  shipping: number
  tax: number
  cryptoAmount: number | null
  cryptoCurrency: string | null
  paymentAddress: string | null
  paymentMemo: string | null
  trackingNumber: string | null
  adminNotes: string | null
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  user: {
    id: string
    name: string
    email: string
  }
  address: {
    name: string
    phone: string
    address: string
    city: string
    state: string
    postalCode: string
    country: string
  } | null
  items: OrderItem[]
}

const STATUS_ALIASES: Record<string, string> = {
  pending: 'PENDING_PAYMENT',
  confirming: 'PAYMENT_CONFIRMING',
  paid: 'PAID',
  processing: 'PROCESSING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

function resolveStatusParam(raw: string | null): string {
  if (!raw || raw === 'all') return 'all'
  const lower = raw.toLowerCase()
  return STATUS_ALIASES[lower] || raw
}

export function OrdersClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(resolveStatusParam(searchParams.get('status')))
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(searchParams.get('paymentStatus') || 'all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState(searchParams.get('paymentMethod') || 'all')
  const [updateData, setUpdateData] = useState({
    status: '',
    paymentStatus: '',
    trackingNumber: '',
    adminNotes: '',
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const syncUrl = useCallback(
    (updates: {
      status?: string
      paymentStatus?: string
      paymentMethod?: string
      search?: string
      page?: number
    }) => {
      const params = new URLSearchParams(searchParams.toString())
      const setOrDelete = (key: string, value: string | undefined, omit = 'all') => {
        if (!value || value === omit) params.delete(key)
        else params.set(key, value)
      }
      if (updates.status !== undefined) setOrDelete('status', updates.status)
      if (updates.paymentStatus !== undefined) setOrDelete('paymentStatus', updates.paymentStatus)
      if (updates.paymentMethod !== undefined) setOrDelete('paymentMethod', updates.paymentMethod)
      if (updates.search !== undefined) {
        if (!updates.search.trim()) params.delete('search')
        else params.set('search', updates.search.trim())
      }
      if (updates.page !== undefined) {
        if (updates.page <= 1) params.delete('page')
        else params.set('page', String(updates.page))
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (paymentStatusFilter !== 'all') params.append('paymentStatus', paymentStatusFilter)
      if (paymentMethodFilter !== 'all') params.append('paymentMethod', paymentMethodFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      params.append('page', String(page))
      params.append('limit', '20')

      const response = await fetch(`/api/admin/orders?${params.toString()}`)
      const data = await response.json()
      setOrders(data.orders || [])
      setTotalPages(data.pages || 1)
      setTotalCount(data.total ?? (data.orders || []).length)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, paymentStatusFilter, paymentMethodFilter, searchQuery, page])

  // Sync filters from URL on first load / external navigation (e.g. dashboard deep link)
  useEffect(() => {
    const urlStatus = resolveStatusParam(searchParams.get('status'))
    const urlPayment = searchParams.get('paymentStatus') || 'all'
    const urlMethod = searchParams.get('paymentMethod') || 'all'
    const urlSearch = searchParams.get('search') || ''
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

    setStatusFilter(urlStatus)
    setPaymentStatusFilter(urlPayment)
    setPaymentMethodFilter(urlMethod)
    setSearchQuery(urlSearch)
    setPage(urlPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    syncUrl({ status: value, page: 1 })
  }

  const handlePaymentStatusChange = (value: string) => {
    setPaymentStatusFilter(value)
    setPage(1)
    syncUrl({ paymentStatus: value, page: 1 })
  }

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethodFilter(value)
    setPage(1)
    syncUrl({ paymentMethod: value, page: 1 })
  }

  const handleSearchSubmit = () => {
    setPage(1)
    syncUrl({ search: searchQuery, page: 1 })
  }

  const handleViewDetails = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`)
      const data = await response.json()
      setSelectedOrder(data.order)
      setIsDetailsOpen(true)
    } catch (error) {
      console.error('Failed to fetch order details:', error)
      toast.error('Failed to fetch order details')
    }
  }

  const handleApprovePayment = async (orderId: string) => {
    if (!confirm('Are you sure you want to approve this payment? This will mark the order as paid and move it to processing.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Payment approved successfully!')
        fetchOrders()
        if (selectedOrder?.id === orderId) {
          const updatedOrder = await fetch(`/api/admin/orders/${orderId}`).then(r => r.json())
          setSelectedOrder(updatedOrder.order)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to approve payment')
      }
    } catch (error) {
      console.error('Approve payment error:', error)
      toast.error('An error occurred')
    }
  }

  const handleOpenUpdate = (order: Order) => {
    setSelectedOrder(order)
    setUpdateData({
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber || '',
      adminNotes: order.adminNotes || '',
    })
    setIsUpdateOpen(true)
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        toast.success('Order updated successfully!')
        setIsUpdateOpen(false)
        fetchOrders()
        if (isDetailsOpen) {
          const updatedOrder = await fetch(`/api/admin/orders/${selectedOrder.id}`).then(r => r.json())
          setSelectedOrder(updatedOrder.order)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update order')
      }
    } catch (error) {
      console.error('Update order error:', error)
      toast.error('An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredOrders = orders

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING_PAYMENT: 'bg-yellow-500',
      PAYMENT_CONFIRMING: 'bg-blue-500',
      PAID: 'bg-green-500',
      PROCESSING: 'bg-purple-500',
      SHIPPED: 'bg-indigo-500',
      DELIVERED: 'bg-teal-500',
      COMPLETED: 'bg-green-600',
      CANCELLED: 'bg-red-500',
      REFUNDED: 'bg-orange-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const getPaymentStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500',
      CONFIRMING: 'bg-blue-500',
      COMPLETED: 'bg-green-500',
      FAILED: 'bg-red-500',
      EXPIRED: 'bg-gray-500',
      REFUNDED: 'bg-orange-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Icon icon="solar:refresh-circle-linear" className="size-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">Orders Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all customer orders
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {totalCount} orders
          {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Search</Label>
            <Input
              placeholder="Search by order #, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Order Status</Label>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
                <SelectItem value="PAYMENT_CONFIRMING">Payment Confirming</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Payment Status</Label>
            <Select value={paymentStatusFilter} onValueChange={handlePaymentStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMING">Confirming</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Payment Method</Label>
            <Select value={paymentMethodFilter} onValueChange={handlePaymentMethodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="USDT_TRC20">USDT (TRC20)</SelectItem>
                <SelectItem value="USDT_ERC20">USDT (ERC20)</SelectItem>
                <SelectItem value="BTC">Bitcoin</SelectItem>
                <SelectItem value="ETH">Ethereum</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CASH_ON_DELIVERY">Cash on Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Icon icon="solar:bag-3-bold" className="size-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try adjusting your search filters' : 'No orders match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card rounded-xl p-6 border border-border/50 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">#{order.orderNumber}</h3>
                        <Badge className={getStatusBadgeColor(order.status)}>
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={getPaymentStatusBadgeColor(order.paymentStatus)}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon icon="solar:user-bold" className="size-4" />
                          {order.user.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="solar:letter-bold" className="size-4" />
                          {order.user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon icon="solar:calendar-bold" className="size-4" />
                          {formatDateTime(order.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary mb-1">
                        {formatPrice(order.total)}
                      </p>
                      {order.paymentMethod && (
                        <p className="text-xs text-muted-foreground">
                          {order.paymentMethod.replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="flex gap-2 mb-3">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="size-12 rounded bg-muted overflow-hidden flex-shrink-0"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon icon="solar:box-bold" className="size-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="size-12 rounded bg-muted flex items-center justify-center text-xs font-medium">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 lg:flex-col">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(order.id)}
                  >
                    <Icon icon="solar:eye-bold" className="mr-2 size-4" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenUpdate(order)}
                  >
                    <Icon icon="solar:pen-bold" className="mr-2 size-4" />
                    Update
                  </Button>
                  {order.paymentStatus === 'PENDING' &&
                    (order.paymentMethod === 'USDT_TRC20' ||
                      order.paymentMethod === 'USDT_ERC20' ||
                      order.paymentMethod === 'BTC' ||
                      order.paymentMethod === 'ETH') && (
                      <Button
                        size="sm"
                        onClick={() => handleApprovePayment(order.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Icon icon="solar:check-circle-bold" className="mr-2 size-4" />
                        Approve Payment
                      </Button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => {
              const next = page - 1
              setPage(next)
              syncUrl({ page: next })
            }}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => {
              const next = page + 1
              setPage(next)
              syncUrl({ page: next })
            }}
          >
            Next
          </Button>
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Order #{selectedOrder.orderNumber}</DialogTitle>
                <DialogDescription>
                  Order placed on {formatDateTime(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex gap-2">
                  <Badge className={getStatusBadgeColor(selectedOrder.status)}>
                    {selectedOrder.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className={getPaymentStatusBadgeColor(selectedOrder.paymentStatus)}>
                    Payment: {selectedOrder.paymentStatus}
                  </Badge>
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong> {selectedOrder.user.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedOrder.user.email}
                    </p>
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.address && (
                  <div>
                    <h3 className="font-semibold mb-2">Shipping Address</h3>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      <p>{selectedOrder.address.name}</p>
                      <p>{selectedOrder.address.phone}</p>
                      <p>{selectedOrder.address.address}</p>
                      <p>
                        {selectedOrder.address.city}, {selectedOrder.address.state}{' '}
                        {selectedOrder.address.postalCode}
                      </p>
                      <p>{selectedOrder.address.country}</p>
                    </div>
                  </div>
                )}

                {/* Crypto Payment Info */}
                {selectedOrder.paymentMethod &&
                  (selectedOrder.paymentMethod === 'USDT_TRC20' ||
                    selectedOrder.paymentMethod === 'USDT_ERC20' ||
                    selectedOrder.paymentMethod === 'BTC' ||
                    selectedOrder.paymentMethod === 'ETH') && (
                    <div>
                      <h3 className="font-semibold mb-2">Crypto Payment Details</h3>
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Currency:</span>
                          <span className="font-medium">{selectedOrder.cryptoCurrency}</span>
                        </div>
                        {selectedOrder.cryptoAmount && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-medium">
                              {selectedOrder.cryptoAmount} {selectedOrder.cryptoCurrency}
                            </span>
                          </div>
                        )}
                        {selectedOrder.paymentAddress && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-muted-foreground">Wallet Address:</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  copyToClipboard(selectedOrder.paymentAddress!)
                                  toast.success('Address copied!')
                                }}
                              >
                                <Icon icon="solar:copy-bold" className="size-4" />
                              </Button>
                            </div>
                            <p className="font-mono text-xs break-all bg-background p-2 rounded">
                              {selectedOrder.paymentAddress}
                            </p>
                          </div>
                        )}
                        {selectedOrder.paymentMemo && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Memo:</span>
                            <span className="font-medium">{selectedOrder.paymentMemo}</span>
                          </div>
                        )}
                        {selectedOrder.paymentStatus === 'PENDING' && (
                          <Button
                            className="w-full mt-3 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              handleApprovePayment(selectedOrder.id)
                              setIsDetailsOpen(false)
                            }}
                          >
                            <Icon icon="solar:check-circle-bold" className="mr-2 size-4" />
                            Approve Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="size-16 rounded bg-muted overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon icon="solar:box-bold" className="size-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                          {item.variant && (
                            <p className="text-xs text-muted-foreground">
                              Variant: {item.variant}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(item.price)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Order Summary</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>{formatPrice(selectedOrder.shipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatPrice(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                      <span>Total:</span>
                      <span className="text-primary">{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Tracking */}
                {selectedOrder.trackingNumber && (
                  <div>
                    <h3 className="font-semibold mb-2">Tracking Information</h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="font-mono text-sm">{selectedOrder.trackingNumber}</p>
                      {selectedOrder.shippedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Shipped: {formatDateTime(selectedOrder.shippedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedOrder.adminNotes && (
                  <div>
                    <h3 className="font-semibold mb-2">Admin Notes</h3>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      {selectedOrder.adminNotes}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Order Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Order #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Update order status, payment status, tracking number, and admin notes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Order Status</Label>
              <Select
                value={updateData.status}
                onValueChange={(value) =>
                  setUpdateData({ ...updateData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
                  <SelectItem value="PAYMENT_CONFIRMING">Payment Confirming</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Status</Label>
              <Select
                value={updateData.paymentStatus}
                onValueChange={(value) =>
                  setUpdateData({ ...updateData, paymentStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMING">Confirming</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tracking Number</Label>
              <Input
                value={updateData.trackingNumber}
                onChange={(e) =>
                  setUpdateData({ ...updateData, trackingNumber: e.target.value })
                }
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <Label>Admin Notes</Label>
              <Textarea
                value={updateData.adminNotes}
                onChange={(e) =>
                  setUpdateData({ ...updateData, adminNotes: e.target.value })
                }
                placeholder="Internal notes (not visible to customer)"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsUpdateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateOrder}
                loading={isUpdating}
              >
                Update Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
