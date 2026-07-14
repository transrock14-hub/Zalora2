'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { formatPrice } from '@/lib/utils'
import { salesPriceFromWholesale } from '@/lib/wholesale-pricing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  wholesalePrice: number | null
  salePrice: number
  image: string
  categoryName: string
  categoryId: string
}

interface Category {
  id: string
  name: string
  slug: string
}

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  balance: number
  shop: {
    id: string
    name: string
    status?: string
  } | null
}

interface WholesaleClientProps {
  products: Product[]
  total: number
  pages: number
  page: number
  categories: Category[]
  user: User | null
  listedCatalogIds: string[]
  searchParams: {
    category?: string
    minPrice?: string
    maxPrice?: string
    search?: string
  }
}

export function WholesaleClient({
  products,
  total,
  pages,
  page,
  categories,
  user,
  listedCatalogIds = [],
  searchParams,
}: WholesaleClientProps) {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [minPrice, setMinPrice] = useState(searchParams.minPrice || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.maxPrice || '')
  const [search, setSearch] = useState(searchParams.search || '')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
  const [listingLoading, setListingLoading] = useState(false)
  const [listedIds, setListedIds] = useState<Set<string>>(() => new Set(listedCatalogIds))

  const isListed = (catalogId: string) => listedIds.has(catalogId)

  const openListingModal = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()
    if (isListed(product.id)) return
    setModalProduct(product)
  }

  const closeModal = () => {
    if (!listingLoading) setModalProduct(null)
  }

  const handleConfirmListing = async () => {
    if (!modalProduct) return
    const wholesalePrice = modalProduct.wholesalePrice ?? modalProduct.price
    setListingLoading(true)
    try {
      const res = await fetch('/api/account/wholesale/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: modalProduct.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'INSUFFICIENT_BALANCE' || data.error?.toLowerCase().includes('insufficient')) {
          toast.error('Insufficient balance. Product was not added.')
        } else if (data.code === 'ALREADY_LISTED' || data.error?.toLowerCase().includes('already listed')) {
          setListedIds((prev) => new Set(prev).add(modalProduct.id))
          toast.error('Already listed.')
        } else {
          toast.error(data.error || 'Failed to add product')
        }
        return
      }
      toast.success('Product added to products')
      setListedIds((prev) => new Set(prev).add(modalProduct.id))
      closeModal()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setListingLoading(false)
    }
  }

  const selectedCategory = searchParams.category || 'all'

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(params.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        newParams.set(key, value)
      } else {
        newParams.delete(key)
      }
    })
    
    newParams.delete('page') // Reset to page 1 when filters change
    
    startTransition(() => {
      router.push(`/account/wholesale?${newParams.toString()}`)
    })
  }

  const handleCategoryChange = (categoryId: string) => {
    updateFilters({ category: categoryId })
  }

  const handlePriceFilter = () => {
    updateFilters({
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: search || undefined })
  }

  const menuItems = [
    { icon: 'solar:user-bold', label: 'My Account', href: '/account', active: false },
    { icon: 'solar:wallet-bold', label: 'Current Balance', href: '/account/wallet', active: false },
    { icon: 'solar:box-bold', label: 'My Orders', href: '/account/orders', active: false },
    { icon: 'solar:document-text-bold', label: 'Billing records', href: '/account/billing', active: false },
    { icon: 'solar:download-bold', label: 'Recharge Record', href: '/account/wallet/topup', active: false },
    { icon: 'solar:upload-bold', label: 'Withdrawal Record', href: '/account/wallet/withdraw', active: false },
    { icon: 'solar:wallet-bold', label: 'Wallet Management', href: '/account/wallet', active: false },
    { icon: 'solar:map-point-bold', label: 'Delivery address management', href: '/account/addresses', active: false },
    { icon: 'solar:chat-round-bold', label: 'Internal Message', href: '/account/support', active: false },
  ]

  const hasApprovedShop = !!(user?.shop && (user.shop as { status?: string }).status === 'ACTIVE')
  const wholesaleItems = [
    { icon: 'solar:shop-2-bold', label: 'Shop Management', href: '/account/wholesale', active: true, inactive: false },
    { icon: 'solar:shop-bold', label: 'Shop Details', href: user?.shop ? '/seller/shop' : '/seller/create-shop', active: false, inactive: !hasApprovedShop },
    { icon: 'solar:box-bold', label: 'Product Management', href: '/seller/products', active: false, inactive: !hasApprovedShop },
    { icon: 'solar:bill-list-bold', label: 'Store Orders', href: '/seller/orders', active: false, inactive: !hasApprovedShop },
  ]

  return (
    <div className="min-h-screen bg-gray-50/30 flex relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-gray-200/60 flex-shrink-0 z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="sticky top-0 h-screen overflow-y-auto">
          {/* User Profile */}
          <div className="p-6 border-b border-gray-200/60">
            <div className="flex items-center justify-between mb-4 lg:justify-center lg:mb-0 lg:flex-col lg:gap-3">
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="relative size-20 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user?.name || 'User'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon icon="solar:user-bold" className="size-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{user?.name || 'User'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{user?.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <Icon icon="solar:close-circle-linear" className="size-6" />
              </Button>
            </div>
          </div>

          {/* Account Management */}
          <div className="p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Account Management
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    item.active
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon icon={item.icon} className="size-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Shop Management */}
          <div className="p-4 border-t border-gray-200/60">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Shop Management
            </div>
            <nav className="space-y-1">
              {wholesaleItems.map((item) =>
                item.inactive ? (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 cursor-not-allowed opacity-70"
                    title="Open a shop to access"
                  >
                    <Icon icon={item.icon} className="size-5" />
                    <span>{item.label}</span>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
                      item.active
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.active && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                    )}
                    <Icon icon={item.icon} className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="bg-white border-b border-gray-200/60 sticky top-0 z-10">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Icon icon="solar:hamburger-menu-linear" className="size-6" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Shop Management</h1>
            </div>
            
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 pt-4 border-t border-gray-200/60">
              <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" size="sm" variant="outline">
                  <Icon icon="solar:magnifer-linear" className="size-4" />
                </Button>
              </form>
              
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Lowest Price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-32"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  placeholder="Highest Price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-32"
                />
                <Button
                  onClick={handlePriceFilter}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isPending}
                >
                  Filter
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="p-4 lg:p-6">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <Icon icon="solar:box-linear" className="size-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {products.length} of {total} products
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group bg-white rounded-lg border border-gray-200/60 overflow-hidden hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-square bg-gray-50 overflow-hidden">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-red-600">
                          {formatPrice(product.salePrice)}
                        </span>
                        {product.comparePrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(product.comparePrice)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => openListingModal(e, product)}
                        disabled={isListed(product.id)}
                        className={`w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium ${
                          isListed(product.id)
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
                        }`}
                        aria-label={isListed(product.id) ? 'Listed' : 'List'}
                      >
                        <Image src="/images/iconshop.png" alt="" width={20} height={20} />
                        {isListed(product.id) ? 'Listed' : 'List'}
                      </button>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Listing modal */}
              {modalProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
                  <div
                    className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button type="button" onClick={closeModal} className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600" aria-label="Close">
                      <Icon icon="solar:close-circle-linear" className="size-5" />
                    </button>
                    <div className="flex items-start gap-3 p-4 border-b border-gray-200">
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image src={modalProduct.image} alt={modalProduct.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{modalProduct.name}</h3>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="flex justify-between text-sm">
                        <span className="text-gray-600">Wholesale Price:</span>
                        <span className="font-bold text-red-600">
                          {formatPrice(modalProduct.wholesalePrice ?? modalProduct.price)}
                        </span>
                      </p>
                      <p className="flex justify-between text-sm">
                        <span className="text-gray-600">Sales Price (+20%):</span>
                        <span className="font-bold text-red-600">
                          {formatPrice(
                            modalProduct.wholesalePrice != null && modalProduct.wholesalePrice > 0
                              ? salesPriceFromWholesale(modalProduct.wholesalePrice)
                              : modalProduct.salePrice
                          )}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You pay wholesale when shipping; you receive the sales price when delivered. Profit is 20%.
                      </p>
                    </div>
                    <div className="flex gap-2 p-4 border-t border-gray-200">
                      <Button variant="outline" className="flex-1" onClick={closeModal} disabled={listingLoading}>
                        Cancel
                      </Button>
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleConfirmListing} disabled={listingLoading}>
                        {listingLoading ? 'Adding...' : 'Confirm listing'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newParams = new URLSearchParams(params.toString())
                      newParams.set('page', String(Math.max(1, page - 1)))
                      router.push(`/account/wholesale?${newParams.toString()}`)
                    }}
                    disabled={page === 1 || isPending}
                  >
                    <Icon icon="solar:alt-arrow-left-linear" className="size-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                      let pageNum: number
                      if (pages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= pages - 2) {
                        pageNum = pages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            const newParams = new URLSearchParams(params.toString())
                            newParams.set('page', String(pageNum))
                            router.push(`/account/wholesale?${newParams.toString()}`)
                          }}
                          disabled={isPending}
                          className={page === pageNum ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newParams = new URLSearchParams(params.toString())
                      newParams.set('page', String(Math.min(pages, page + 1)))
                      router.push(`/account/wholesale?${newParams.toString()}`)
                    }}
                    disabled={page === pages || isPending}
                  >
                    <Icon icon="solar:alt-arrow-right-linear" className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
