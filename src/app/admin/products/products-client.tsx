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
  stock: number
  status: string
  isFeatured: boolean
  categoryName: string
  shopName: string | null
  image: string | null
}

interface Category {
  id: string
  name: string
}

interface ProductsClientProps {
  products: Product[]
  total: number
  pages: number
  page: number
  categories: Category[]
  searchParams: {
    search?: string
    category?: string
    status?: string
  }
}

export function ProductsClient({
  products,
  total,
  pages,
  page,
  categories,
  searchParams,
}: ProductsClientProps) {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form method="get" action="/admin/products" className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Icon
                  icon="solar:magnifer-linear"
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                />
                <input
                  type="text"
                  name="search"
                  placeholder="Search by name or SKU..."
                  defaultValue={searchParams.search}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
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
            <select
              name="status"
              defaultValue={searchParams.status}
              className="px-4 py-2 bg-input border border-border rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="ARCHIVED">Archived</option>
            </select>
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
            <p className="text-muted-foreground mb-4">Get started by adding your first product</p>
            <Link href="/admin/products/new">
              <Button>
                <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
                Add Product
              </Button>
            </Link>
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
                  <Link href={`/admin/products/${product.id}`}>
                    <Button size="icon" variant="secondary">
                      <Icon icon="solar:pen-bold" className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <CardContent className="p-4">
                <Link href={`/admin/products/${product.id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  {product.categoryName}
                  {product.shopName && ` • ${product.shopName}`}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-primary">{formatPrice(product.price)}</span>
                    {product.comparePrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.comparePrice)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Stock: {product.stock}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>SKU: {product.sku || 'N/A'}</span>
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
            href={`/admin/products?page=${Math.max(1, page - 1)}`}
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
            href={`/admin/products?page=${Math.min(pages, page + 1)}`}
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
