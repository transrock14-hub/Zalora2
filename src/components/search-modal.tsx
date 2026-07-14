'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/lib/store'
import { useLanguage } from '@/contexts/language-context'
import { debounce } from '@/lib/utils'

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  image: string | null
  categoryName: string
}

interface CategoryItem {
  id: string
  name: string
  slug: string
}

export function SearchModal() {
  const router = useRouter()
  const { t } = useLanguage()
  const searchOpen = useUIStore((state) => state.isSearchOpen)
  const setSearchOpen = useUIStore((state) => state.setSearchOpen)
  
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularCategories, setPopularCategories] = useState<CategoryItem[]>([])

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Fetch popular categories when modal opens (no query)
  useEffect(() => {
    if (!searchOpen) return
    let cancelled = false
    fetch('/api/categories')
      .then((res) => res.ok ? res.json() : { categories: [] })
      .then((data) => {
        if (!cancelled && data.categories?.length) {
          setPopularCategories(data.categories)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [searchOpen])

  // Save to recent searches
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recent-searches', JSON.stringify(updated))
  }

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recent-searches')
  }

  // Debounced search function
  const searchProducts = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.products || [])
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setQuery(value)
    if (value.trim()) {
      setIsLoading(true)
      searchProducts(value)
    } else {
      setResults([])
      setIsLoading(false)
    }
  }

  // Handle product click
  const handleProductClick = (slug: string) => {
    saveRecentSearch(query)
    setSearchOpen(false)
    router.push(`/products/${slug}`)
  }

  // Handle "View All Results"
  const handleViewAll = () => {
    saveRecentSearch(query)
    setSearchOpen(false)
    router.push(`/products?search=${encodeURIComponent(query)}`)
  }

  // Handle recent search click
  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery)
    handleSearchChange(searchQuery)
  }

  // Reset on close
  const handleClose = () => {
    setSearchOpen(false)
    setTimeout(() => {
      setQuery('')
      setResults([])
    }, 200)
  }

  return (
    <Dialog open={searchOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Icon icon="solar:magnifer-linear" className="size-5 text-muted-foreground" />
          <Input
            placeholder={t('searchProducts')}
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
          {query && (
            <button
              onClick={() => handleSearchChange('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon icon="solar:close-circle-linear" className="size-5" />
            </button>
          )}
        </div>

        {/* Search Results */}
        <div className="max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon icon="solar:refresh-circle-linear" className="size-8 text-muted-foreground animate-spin" />
            </div>
          ) : query && results.length > 0 ? (
            <div className="p-2">
              <div className="space-y-1">
                {results.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product.slug)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    {/* Product Image */}
                    <div className="relative size-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon icon="solar:box-linear" className="size-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.categoryName}</p>
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">${product.price.toFixed(2)}</p>
                      {product.comparePrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          ${product.comparePrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* View All Button */}
              <button
                onClick={handleViewAll}
                className="w-full mt-3 p-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {t('viewAll')} ({results.length}+ results)
              </button>
            </div>
          ) : query && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Icon icon="solar:box-minimalistic-linear" className="size-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground text-sm text-center">
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentClick(search)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Icon icon="solar:history-linear" className="size-4 text-muted-foreground" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Categories */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Popular Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {popularCategories.length > 0
                    ? popularCategories.map((category) => (
                        <Link
                          key={category.id}
                          href={`/categories?slug=${encodeURIComponent(category.slug)}`}
                          onClick={handleClose}
                          className="p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium text-center"
                        >
                          {category.name}
                        </Link>
                      ))
                    : ['Women\'s Clothing', 'Men\'s Shoes', 'Electronics', 'Beauty & Health'].map((name, index) => (
                        <Link
                          key={index}
                          href={`/categories?search=${encodeURIComponent(name)}`}
                          onClick={handleClose}
                          className="p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium text-center"
                        >
                          {name}
                        </Link>
                      ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
