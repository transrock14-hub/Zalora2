'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { ProductCard } from '@/components/product-card'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  rating: number
  reviews: number
  image: string
  categoryName: string
  isFeatured: boolean
}

interface DealsClientProps {
  products: Product[]
}

export function DealsClient({ products }: DealsClientProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-destructive px-4 shadow-sm lg:hidden">
        <Link href="/" className="text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-white font-heading">
          <Icon icon="solar:fire-bold" className="size-5 inline mr-1" />
          Hot Deals
        </h1>
        <Link href="/cart" className="text-white">
          <Icon icon="solar:cart-large-linear" className="size-6" />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Desktop Header */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold font-heading text-destructive flex items-center gap-2">
              <Icon icon="solar:fire-bold" className="size-8" />
              Hot Deals & Special Offers
            </h1>
            <p className="text-muted-foreground mt-2">
              Limited time offers and amazing discounts on top products
            </p>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon icon="solar:tag-price-linear" className="size-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No deals available</h3>
              <p className="text-muted-foreground mb-4">
                Check back soon for amazing offers!
              </p>
              <Link
                href="/products"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Browse All Products
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <Icon icon="solar:sale-bold" className="size-5" />
                  <span className="font-bold">{products.length} Amazing Deals</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Save big on premium fashion items. Limited stock available!
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
