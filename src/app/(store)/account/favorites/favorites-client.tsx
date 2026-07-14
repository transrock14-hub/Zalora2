'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { ProductCard } from '@/components/product-card'
import { Card, CardContent } from '@/components/ui/card'

interface Favorite {
  userId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    comparePrice: number | null;
    rating: number;
    reviews: number;
    image: string;
    isFeatured: boolean;
  };
}

export function FavoritesClient({ favorites }: { favorites: Favorite[] }) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          My Favorites
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold font-heading">My Favorites</h1>
            <p className="text-muted-foreground mt-2">Products you love</p>
          </div>

          {favorites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon icon="solar:heart-linear" className="size-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
                <p className="text-muted-foreground mb-4">Start adding products you love</p>
                <Link
                  href="/products"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Browse Products
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {favorites.map((fav) => (
                <ProductCard key={fav.productId} product={fav.product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
