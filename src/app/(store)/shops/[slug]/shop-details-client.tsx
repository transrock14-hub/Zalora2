'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { ProductCard } from '@/components/product-card'
import { useStorePageTitle } from '@/contexts/store-page-title-context'
import { formatPrice } from '@/lib/utils'

interface Shop {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  banner: string | null
  rating?: number
  createdAt?: string | null
  memberSince?: string | null
  followers?: number
  totalSales?: number
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  rating: number
  reviews: number
  image: string
  isFeatured: boolean
}

function formatMemberSince(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export function ShopDetailsClient({
  shop,
  products,
}: {
  shop: Shop
  products: Product[]
}) {
  const setPageTitle = useStorePageTitle()

  useEffect(() => {
    setPageTitle(shop.name)
    return () => setPageTitle(null)
  }, [shop.name, setPageTitle])

  const productCount = products.length
  const rating = Number(shop.rating ?? 0)
  const followers = Number(shop.followers ?? 0)
  const totalSales = Number(shop.totalSales ?? 0)
  const memberSince = formatMemberSince(shop.memberSince ?? shop.createdAt)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile header: compact, no overflow */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 h-14 bg-primary px-3 shadow-sm lg:hidden shrink-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-primary-foreground text-sm font-medium min-w-0 shrink-0"
          aria-label="Back to home"
        >
          <Icon icon="solar:arrow-left-linear" className="size-6 shrink-0" aria-hidden />
          <span className="hidden xs:inline">Back</span>
        </Link>
        <h1 className="flex-1 text-center text-base sm:text-lg font-semibold text-primary-foreground font-heading truncate min-w-0 px-2">
          {shop.name}
        </h1>
        <Link href="/cart" className="text-primary-foreground shrink-0 p-1" aria-label="Cart">
          <Icon icon="solar:cart-large-linear" className="size-6" />
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl w-full">
          <div className="hidden lg:block mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <Icon icon="solar:arrow-left-linear" className="size-4" />
              Back to home
            </Link>
            <nav
              className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <Icon icon="solar:arrow-right-linear" className="size-4 shrink-0" />
              <span className="text-foreground font-medium truncate">
                {shop.name}
              </span>
            </nav>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden mb-6 sm:mb-8">
            {shop.banner ? (
              <div className="relative h-28 sm:h-40 lg:h-52 bg-muted w-full">
                <Image
                  src={shop.banner}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1024px"
                />
              </div>
            ) : null}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              <div className="flex items-start gap-4 sm:gap-6 flex-1 min-w-0">
                {shop.logo ? (
                  <div className="relative size-16 sm:size-20 lg:size-24 rounded-xl overflow-hidden bg-muted shrink-0">
                    <Image
                      src={shop.logo}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, 96px"
                    />
                  </div>
                ) : (
                  <div className="size-16 sm:size-20 lg:size-24 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon
                      icon="solar:shop-bold"
                      className="size-8 sm:size-10 lg:size-12 text-primary"
                      aria-hidden
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
                  <h1 className="text-xl sm:text-2xl font-bold font-heading break-words">
                    {shop.name}
                  </h1>
                  {shop.description ? (
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {shop.description}
                    </p>
                  ) : null}
                </div>
              </div>
              {/* Stats: 2 cols mobile, 4 cols sm+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 sm:gap-3 text-sm text-muted-foreground border-t border-border pt-4 sm:pt-0 sm:border-t-0 sm:grid-cols-4 w-full sm:w-auto sm:min-w-[280px]">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon icon="solar:box-linear" className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{productCount} {productCount === 1 ? 'product' : 'products'}</span>
                </span>
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon icon="solar:users-group-rounded-linear" className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{followers} {followers === 1 ? 'follower' : 'followers'}</span>
                </span>
                <span className="flex items-center gap-1.5 min-w-0 col-span-2 sm:col-span-1">
                  <Icon icon="solar:chart-2-linear" className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">Sales {formatPrice(totalSales)}</span>
                </span>
                {rating > 0 && (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Icon icon="solar:star-bold" className="size-4 text-amber-500 shrink-0" aria-hidden />
                    <span>{rating.toFixed(1)} rating</span>
                  </span>
                )}
                {memberSince && (
                  <span className="flex items-center gap-1.5 min-w-0 col-span-2 sm:col-span-1">
                    <Icon icon="solar:calendar-linear" className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">Since {memberSince}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <h2 className="text-base sm:text-lg font-semibold font-heading mb-3 sm:mb-4">
            Products from this shop
          </h2>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 sm:py-12 px-4 rounded-xl border border-border bg-card">
              <Icon
                icon="solar:box-linear"
                className="size-14 sm:size-16 text-muted-foreground/30 mb-4"
              />
              <h3 className="text-base sm:text-lg font-medium mb-2">No products yet</h3>
              <p className="text-muted-foreground text-center text-sm sm:text-base">
                This shop has not listed any products.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
