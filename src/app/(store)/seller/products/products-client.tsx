'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, getStatusColor } from '@/lib/utils'

interface Product {
  id: string
  name: string
  sku: string | null
  price: number
  comparePrice: number | null
  costPrice: number | null
  stock: number
  status: string
  isFeatured: boolean
  categoryName: string
  image: string | null
}

interface Category {
  id: string
  name: string
}

interface SellerProductsClientProps {
  products: Product[]
  total: number
  pages: number
  page: number
  categories: Category[]
  searchParams: {
    category?: string
    minPrice?: string
    maxPrice?: string
  }
}

export function SellerProductsClient({
  products,
  total,
  pages,
  page,
  categories,
  searchParams,
}: SellerProductsClientProps) {
  return (
    <div className="space-y-6 pb-20 lg:pb-0 container mx-auto px-4 sm:px-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 sm:pt-6">
        <div className="min-w-0 flex items-center gap-3">
          <Link href="/account" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading">Product Management</h1>
            <p className="text-muted-foreground mt-1">Manage your product catalog</p>
          </div>
        </div>
      </div>

      {/* Filters: Price + Categories only */}
      <Card>
        <CardContent className="p-4">
          <form method="get" action="/seller/products" className="flex flex-wrap gap-4">
            <select
              name="category"
              defaultValue={searchParams.category}
              className="px-4 py-2 bg-input border border-border rounded-lg text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="minPrice"
              placeholder="Min price"
              defaultValue={searchParams.minPrice}
              className="w-28 px-3 py-2 bg-input border border-border rounded-lg text-sm"
              min={0}
              step="0.01"
            />
            <span className="text-muted-foreground self-center">–</span>
            <input
              type="number"
              name="maxPrice"
              placeholder="Max price"
              defaultValue={searchParams.maxPrice}
              className="w-28 px-3 py-2 bg-input border border-border rounded-lg text-sm"
              min={0}
              step="0.01"
            />
            <Button type="submit" variant="secondary">
              <Icon icon="solar:filter-bold" className="mr-2 size-4" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {products.length} of {total} products</span>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:box-linear" className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or list products from Wholesale Management.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden group">
              <div className="aspect-square relative bg-muted">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon icon="solar:box-linear" className="size-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <Badge variant="outline" className={getStatusColor(product.status)}>
                    {product.status}
                  </Badge>
                  {product.isFeatured && (
                    <Badge variant="secondary">
                      <Icon icon="solar:star-bold" className="mr-1 size-3" />
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/seller/products/${product.id}`}>
                    <Button size="icon" variant="secondary">
                      <Icon icon="solar:pen-bold" className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <CardContent className="p-4">
                <Link href={`/seller/products/${product.id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground mt-1">{product.categoryName}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sale price</span>
                    <span className="font-bold text-primary">{formatPrice(product.price)}</span>
                  </div>
                  {product.costPrice != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Bought price</span>
                      <span>{formatPrice(product.costPrice)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>SKU: {product.sku || 'N/A'}</span>
                  <span>Stock: {product.stock}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/seller/products?page=${Math.max(1, page - 1)}${searchParams.category ? `&category=${searchParams.category}` : ''}${searchParams.minPrice ? `&minPrice=${searchParams.minPrice}` : ''}${searchParams.maxPrice ? `&maxPrice=${searchParams.maxPrice}` : ''}`}
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
            href={`/seller/products?page=${Math.min(pages, page + 1)}${searchParams.category ? `&category=${searchParams.category}` : ''}${searchParams.minPrice ? `&minPrice=${searchParams.minPrice}` : ''}${searchParams.maxPrice ? `&maxPrice=${searchParams.maxPrice}` : ''}`}
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
