'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/lib/store'
import { useLanguage } from '@/contexts/language-context'

interface MainShopProduct {
  id: string
  name: string
  slug: string
  price: number
  image: string | null
  categoryName: string
  status: string
}

interface SellerAddFromCatalogClientProps {
  products: MainShopProduct[]
  categories: { id: string; name: string }[]
  selectedCategoryId: string | null
}

export function SellerAddFromCatalogClient({
  products,
  categories,
  selectedCategoryId,
}: SellerAddFromCatalogClientProps) {
  const { t } = useLanguage()
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToStore = (p: MainShopProduct) => {
    addItem({
      productId: p.id,
      name: p.name,
      price: p.price,
      image: p.image || '/images/placeholder.png',
      quantity: 1,
      shopId: undefined, // main shop = no shopId
    })
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 container mx-auto px-4 max-w-6xl">
      <div className="flex flex-col gap-4 pt-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">{t('addProductsFromMainShop')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('addProductsFromMainShopDescription')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/seller/products">
            <Button variant="outline" size="sm">
              <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
              {t('backToProducts')}
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" size="sm">
              {t('browseMainShop')}
            </Button>
          </Link>
          <Link href="/cart">
            <Button size="sm">
              <Icon icon="solar:cart-large-2-bold" className="mr-2 size-4" />
              {t('cartAndCheckout')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Category filter - link to same page with category param */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/seller/products/new"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            !selectedCategoryId ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {t('all')}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/seller/products/new?category=${encodeURIComponent(c.id)}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              selectedCategoryId === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Icon icon="solar:box-linear" className="size-16 mx-auto mb-4 opacity-50" />
            <p>{t('noMainShopProductsInCategory')}</p>
            <Link href="/products">
              <Button className="mt-4">{t('browseMainShop')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-square relative bg-muted">
                <Image
                  src={p.image || '/images/placeholder.png'}
                  alt={p.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {p.status !== 'ACTIVE' && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-muted/90 text-xs">
                    {p.status}
                  </span>
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium line-clamp-2 mb-1">{p.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{p.categoryName}</p>
                <p className="text-base font-bold text-primary mb-2">{formatPrice(p.price)}</p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleAddToStore(p)}
                >
                  <Icon icon="solar:cart-large-2-bold" className="mr-2 size-4" />
                  Add to cart (for my store)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
