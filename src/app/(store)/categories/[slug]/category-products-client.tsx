'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

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

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  children: {
    id: string
    name: string
    slug: string
  }[]
}

interface SearchParams {
  page?: string
  sort?: string
}

interface CategoryProductsClientProps {
  category: Category
  products: Product[]
  total: number
  pages: number
  page: number
  searchParams: SearchParams
}

export function CategoryProductsClient({
  category,
  products,
  total,
  pages,
  page,
  searchParams,
}: CategoryProductsClientProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState(searchParams.sort || '')

  const handleSortChange = (value: string) => {
    setSortBy(value)
    const params = new URLSearchParams()
    if (value) params.set('sort', value)
    router.push(`/categories/${category.slug}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/categories" className="flex items-center gap-1.5 text-primary-foreground" aria-label="Back to categories">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading truncate max-w-[50%]">
          {category.name}
        </h1>
        <Link href="/cart" className="text-primary-foreground" aria-label="Cart">
          <Icon icon="solar:cart-large-linear" className="size-6" />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Desktop Header + Breadcrumb */}
          <div className="hidden lg:block mb-6">
            <Link href="/categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              <Icon icon="solar:arrow-left-linear" className="size-4" />
              Back to categories
            </Link>
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <Icon icon="solar:arrow-right-linear" className="size-4 shrink-0" />
              <Link href="/categories" className="hover:text-foreground">Categories</Link>
              <Icon icon="solar:arrow-right-linear" className="size-4 shrink-0" />
              <span className="text-foreground font-medium truncate">{category.name}</span>
            </nav>
            <h1 className="text-3xl font-bold font-heading">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground mt-2">{category.description}</p>
            )}
          </div>

          {/* Subcategories */}
          {category.children.length > 0 && (
            <div className="mb-6 p-4 rounded-xl border border-border bg-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Subcategories</h3>
              <div className="flex flex-wrap gap-2">
                {category.children.map((sub) => (
                  <Link key={sub.id} href={`/categories/${sub.slug}`}>
                    <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                      {sub.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 p-4 rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? 'product' : 'products'} found
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-category" className="text-sm text-muted-foreground shrink-0">Sort</label>
              <select
                id="sort-category"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="flex-1 min-w-0 sm:w-auto px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-border bg-card">
              <Icon icon="solar:box-linear" className="size-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                This category doesn't have any products yet.
              </p>
              <Link href="/products">
                <Button>Browse All Products</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-2 mt-8 py-4" aria-label="Pagination">
              <Link
                href={`/categories/${category.slug}?page=${Math.max(1, page - 1)}${
                  searchParams.sort ? `&sort=${searchParams.sort}` : ''
                }`}
                className={page <= 1 ? 'pointer-events-none opacity-50' : 'inline-flex'}
                aria-disabled={page <= 1}
              >
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Icon icon="solar:arrow-left-linear" className="size-4" />
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground px-4 py-2">
                Page {page} of {pages}
              </span>
              <Link
                href={`/categories/${category.slug}?page=${Math.min(pages, page + 1)}${
                  searchParams.sort ? `&sort=${searchParams.sort}` : ''
                }`}
                className={page >= pages ? 'pointer-events-none opacity-50' : 'inline-flex'}
                aria-disabled={page >= pages}
              >
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Icon icon="solar:arrow-right-linear" className="size-4" />
                </Button>
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
