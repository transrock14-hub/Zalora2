'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'

export default function CartPage() {
  const { t } = useLanguage()
  const { items, removeItem, updateQuantity, clearCart, selectedIds, toggleSelected, setSelectedIds } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reconcile selection with the current items: drop stale ids and default to all selected.
  useEffect(() => {
    if (!mounted) return
    const validIds = items.map((i) => i.id)
    const reconciled = selectedIds.filter((id) => validIds.includes(id))
    if (reconciled.length === 0 && items.length > 0) {
      setSelectedIds(validIds)
    } else if (reconciled.length !== selectedIds.length) {
      setSelectedIds(reconciled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, items])

  const selectedItems = selectedIds

  const toggleSelect = (id: string) => toggleSelected(id)

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((i) => i.id))
    }
  }

  const selectedTotal = items
    .filter(i => selectedItems.includes(i.id))
    .reduce((total, item) => total + item.price * item.quantity, 0)

  const selectedCount = items
    .filter(i => selectedItems.includes(i.id))
    .reduce((count, item) => count + item.quantity, 0)

  // Avoid hydration mismatch: cart store is from localStorage so server has empty state.
  // Render empty-cart placeholder until mounted, then show real cart.
  if (!mounted || items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
        <div className="bg-primary px-4 pt-4 pb-6 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white">
              <Icon icon="solar:arrow-left-linear" className="size-6" />
            </Link>
            <h1 className="text-white text-lg font-bold font-heading">{t('shoppingCart')}</h1>
            <div className="size-6" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Icon icon="solar:cart-large-linear" className="size-24 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('emptyCart')}</h2>
          <p className="text-muted-foreground text-center mb-6">
            {t('emptyCartDescription')}
          </p>
          <Button asChild>
            <Link href="/products">
              <Icon icon="solar:bag-3-bold" className="mr-2 size-4" />
              {t('startShopping')}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-44 lg:pb-0">
      {/* Mobile Header */}
      <div className="bg-primary px-4 pt-4 pb-6 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-white text-lg font-bold font-heading">{t('shoppingCart')}</h1>
          <button onClick={clearCart} className="text-white">
            <Icon icon="solar:trash-bin-trash-linear" className="size-6" />
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold font-heading">{t('shoppingCart')}</h1>
        <p className="text-muted-foreground">{items.length} {t('items')} in your cart</p>
      </div>

      <div className="flex-1 px-4 mt-4 lg:container lg:mx-auto">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {/* Select All */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.length}
                  onChange={toggleSelectAll}
                  className="size-5 rounded border-2 border-border accent-primary"
                />
                <span className="text-sm font-medium text-foreground">{t('selectAll')}</span>
                <span className="text-xs text-muted-foreground">({items.length} {t('items')})</span>
              </div>
            </div>

            {/* Items List */}
            <div className="flex flex-col gap-4 mb-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl p-4 border border-border/50 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="size-5 rounded border-2 border-border accent-primary mt-1"
                    />
                    <div className="size-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-1">
                        {item.name}
                      </h4>
                      {item.variant && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {item.variant.name}: {item.variant.value}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-primary">
                          {formatPrice(item.price)}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="text-muted-foreground size-6 flex items-center justify-center border border-border rounded hover:bg-muted"
                          >
                            <Icon icon="solar:minus-circle-linear" className="size-4" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="text-primary size-6 flex items-center justify-center border border-primary rounded hover:bg-primary/10"
                          >
                            <Icon icon="solar:add-circle-bold" className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Icon icon="solar:trash-bin-trash-linear" className="size-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary (Desktop) */}
          <div className="hidden lg:block">
            <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm sticky top-24">
              <h3 className="text-lg font-bold mb-4">{t('orderSummary')}</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal')} ({selectedCount} {t('items')})</span>
                  <span>{formatPrice(selectedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('shipping')}</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-bold">
                  <span>{t('total')}</span>
                  <span className="text-primary">{formatPrice(selectedTotal)}</span>
                </div>
              </div>
              <Button asChild className="w-full" size="lg" disabled={selectedCount === 0}>
                <Link href="/checkout">
                  {t('proceedToCheckout')}
                </Link>
              </Button>
              <Link
                href="/products"
                className="block text-center text-sm text-primary mt-4 hover:underline"
              >
                {t('continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Checkout Bar - above bottom nav; safe area; space for assistant FAB */}
      <div className="fixed left-0 right-0 bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-40 lg:hidden bottom-14 pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 pr-24 py-4 flex flex-col gap-3 max-w-[100vw] min-h-[88px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">{t('total')} ({selectedCount} {t('items')})</span>
            <span className="text-xl font-bold text-primary tabular-nums">{formatPrice(selectedTotal)}</span>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button variant="outline" size="default" className="flex-1 min-h-11 text-sm font-medium shrink-0" asChild>
              <Link href="/products">
                {t('continueShopping')}
              </Link>
            </Button>
            <Button asChild size="default" className="flex-1 min-h-11 font-semibold min-w-0 shrink-0" disabled={selectedCount === 0}>
              <Link href="/checkout">
                {t('checkout')} ({selectedCount})
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
