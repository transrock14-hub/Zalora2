'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

const ORDER_COUNT_OPTIONS = [1, 2, 3, 5] as const

interface Product {
  id: string
  name: string
  price: number
  slug: string
  shopId: string
  shopName: string | null
  categoryName: string
  image: string | null
}

interface Shop {
  id: string
  name: string
}

interface Customer {
  id: string
  name: string
  email: string
}

interface TriggerOrdersClientProps {
  products: Product[]
  total: number
  pages: number
  page: number
  shops: Shop[]
  customers: Customer[]
  searchParams: { shop?: string }
}

export function TriggerOrdersClient({
  products,
  total,
  pages,
  page,
  shops,
  customers,
  searchParams,
}: TriggerOrdersClientProps) {
  const router = useRouter()
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [pickerProductId, setPickerProductId] = useState<string | null>(null)
  const [customerUserId, setCustomerUserId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement | null>(null)

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  const selectedCustomer = customers.find((c) => c.id === customerUserId)

  useEffect(() => {
    if (!pickerProductId) return

    const onPointerDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerProductId(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerProductId(null)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pickerProductId])

  const openPicker = (product: Product) => {
    if (!customerUserId) {
      toast.error('Select a customer before triggering an order')
      return
    }
    setPickerProductId((current) => (current === product.id ? null : product.id))
  }

  const handleTrigger = async (product: Product, orderCount: number) => {
    if (!customerUserId) {
      toast.error('Select a customer before triggering an order')
      return
    }

    const quantity = Math.max(1, Math.floor(orderCount))
    setPickerProductId(null)
    setTriggeringId(product.id)
    try {
      const res = await fetch('/api/admin/trigger-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: product.id,
          customerUserId,
          quantity,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to trigger order')
        return
      }
      toast.success(
        quantity === 1
          ? `Order ${data.orderNumber} assigned to ${selectedCustomer?.name || 'customer'}. Seller notified.`
          : `Order ${data.orderNumber} (${quantity}×) assigned to ${selectedCustomer?.name || 'customer'}. Seller notified.`
      )
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setTriggeringId(null)
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold font-heading">Trigger orders</h1>
        <p className="text-muted-foreground text-sm">
          Simulate an order to a shop and assign it to a specific customer. After clicking Trigger order, choose ×1, ×2, ×3, or ×5 — the seller will see that quantity and the total wholesale payment for those units.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label htmlFor="customer">Customer for new orders *</Label>
            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <input
                type="search"
                placeholder="Search customers by name or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="flex-1 px-4 py-2 bg-input border border-border rounded-lg text-sm"
              />
              <select
                id="customer"
                value={customerUserId}
                onChange={(e) => setCustomerUserId(e.target.value)}
                className="flex-1 min-w-[220px] px-4 py-2 bg-input border border-border rounded-lg text-sm"
              >
                <option value="">Select customer...</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            {selectedCustomer ? (
              <p className="text-xs text-muted-foreground mt-2">
                Next order will show as:{' '}
                <span className="font-medium text-foreground">
                  {selectedCustomer.name} · {selectedCustomer.email}
                </span>
              </p>
            ) : (
              <p className="text-xs text-destructive mt-2">
                Choose a customer first — otherwise orders stay assigned to Admin.
              </p>
            )}
          </div>

          <form method="get" action="/admin/trigger-orders" className="flex flex-wrap gap-4">
            <select
              name="shop"
              defaultValue={searchParams.shop || ''}
              className="px-4 py-2 bg-input border border-border rounded-lg text-sm"
            >
              <option value="">All shops</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              <Icon icon="solar:filter-bold" className="mr-2 size-4" />
              Filter by shop
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">Showing {products.length} of {total} listed products</p>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:box-linear" className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No listed products</h3>
            <p className="text-muted-foreground">Select a shop or list products from Wholesale Management.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const isPickerOpen = pickerProductId === product.id
            const isTriggering = triggeringId === product.id

            return (
              <Card key={product.id} className="overflow-hidden group">
                <div className="aspect-square relative bg-muted">
                  {product.image ? (
                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon icon="solar:box-linear" className="size-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{product.shopName || '—'}</p>
                  <p className="font-bold text-primary mb-3">{formatPrice(product.price)}</p>

                  <div className="relative" ref={isPickerOpen ? pickerRef : undefined}>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => openPicker(product)}
                      disabled={isTriggering || !customerUserId}
                    >
                      {isTriggering
                        ? 'Triggering...'
                        : isPickerOpen
                          ? 'Choose quantity'
                          : 'Trigger order'}
                    </Button>

                    {isPickerOpen && !isTriggering && (
                      <div className="absolute left-0 right-0 bottom-full z-20 mb-2 rounded-lg border border-border bg-background p-2 shadow-lg">
                        <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Assign quantity
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {ORDER_COUNT_OPTIONS.map((count) => (
                            <Button
                              key={count}
                              type="button"
                              size="sm"
                              variant={count === 1 ? 'default' : 'outline'}
                              className="h-9 px-0 font-semibold"
                              onClick={() => handleTrigger(product, count)}
                            >
                              ×{count}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/admin/trigger-orders?page=${Math.max(1, page - 1)}${searchParams.shop ? `&shop=${searchParams.shop}` : ''}`}
            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="icon">
              <Icon icon="solar:arrow-left-linear" className="size-4" />
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground px-4">Page {page} of {pages}</span>
          <Link
            href={`/admin/trigger-orders?page=${Math.min(pages, page + 1)}${searchParams.shop ? `&shop=${searchParams.shop}` : ''}`}
            className={page >= pages ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="icon">
              <Icon icon="solar:arrow-right-linear" className="size-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
