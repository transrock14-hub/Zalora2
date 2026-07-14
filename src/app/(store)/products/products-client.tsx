'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductCard } from '@/components/product-card'
import { Input } from '@/components/ui/input'
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
  categoryName: string
  isFeatured: boolean
}

interface Category {
  id: string
  name: string
  slug: string
}

interface SearchParams {
  page?: string
  search?: string
  category?: string
  sort?: string
  minPrice?: string
  maxPrice?: string
}

interface ProductsClientProps {
  products: Product[]
  total: number
  pages: number
  page: number
  categories: Category[]
  searchParams: SearchParams
}

export function ProductsClient({
  products,
  total,
  pages,
  page,
  categories,
  searchParams,
}: ProductsClientProps) {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: searchParams.search || '',
    category: searchParams.category || '',
    sort: searchParams.sort || '',
    minPrice: searchParams.minPrice || '',
    maxPrice: searchParams.maxPrice || '',
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    router.push(`/products?${params.toString()}`)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      sort: '',
      minPrice: '',
      maxPrice: '',
    })
    router.push('/products')
    setShowFilters(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/" className="text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          All Products
        </h1>
        <button onClick={() => setShowFilters(!showFilters)} className="text-white">
          <Icon icon="solar:filter-bold" className="size-6" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold font-heading">All Products</h1>
              <p className="text-muted-foreground mt-2">
                Showing {products.length} of {total} products
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Icon icon="solar:filter-bold" className="size-5" />
              Filters
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <select
                      value={filters.sort}
                      onChange={(e) => handleFilterChange('sort', e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                    >
                      <option value="">Newest First</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="popular">Most Popular</option>
                      <option value="rating">Highest Rated</option>
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Price Range</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-2 mt-4">
                  <Button onClick={applyFilters} className="flex-1">
                    Apply Filters
                  </Button>
                  <Button onClick={clearFilters} variant="outline" className="flex-1">
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Filters */}
          {(searchParams.search || searchParams.category || searchParams.sort) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {searchParams.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchParams.search}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search)
                      params.delete('search')
                      router.push(`/products?${params.toString()}`)
                    }}
                  >
                    <Icon icon="solar:close-circle-linear" className="size-3" />
                  </button>
                </Badge>
              )}
              {searchParams.category && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search)
                      params.delete('category')
                      router.push(`/products?${params.toString()}`)
                    }}
                  >
                    <Icon icon="solar:close-circle-linear" className="size-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon icon="solar:box-linear" className="size-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Link
                href={`/products?page=${Math.max(1, page - 1)}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.category ? `&category=${searchParams.category}` : ''}${
                  searchParams.sort ? `&sort=${searchParams.sort}` : ''
                }`}
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
                href={`/products?page=${Math.min(pages, page + 1)}${
                  searchParams.search ? `&search=${searchParams.search}` : ''
                }${searchParams.category ? `&category=${searchParams.category}` : ''}${
                  searchParams.sort ? `&sort=${searchParams.sort}` : ''
                }`}
                className={page >= pages ? 'pointer-events-none opacity-50' : ''}
              >
                <Button variant="outline" size="icon">
                  <Icon icon="solar:arrow-right-linear" className="size-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
