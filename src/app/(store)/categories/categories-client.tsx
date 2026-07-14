'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { CategoryIcon } from '@/components/category-icon'
import { ProductCard } from '@/components/product-card'
import { useLanguage } from '@/contexts/language-context'
import { getCategoryTranslationKey } from '@/lib/category-translations'
import { LanguageSelector } from '@/components/language-selector'
import { useCartStore, useUIStore, useUserStore } from '@/lib/store'

interface Subcategory {
  id: string
  name: string
  slug: string
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  image: string | null
  productCount: number
  subcategories: Subcategory[]
  color: string
  iconColor: string
}

interface CategoryProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  rating: number
  reviews: number
  image: string
}

interface CategoriesClientProps {
  categories: Category[]
}

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const slugParam = searchParams.get('slug')
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const user = useUserStore((s) => s.user)
  const cartCount = useCartStore((s) => s.getItemCount())
  const [categoryProducts, setCategoryProducts] = useState<CategoryProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const selectedSlug =
    slugParam && categories.some((c) => c.slug === slugParam)
      ? slugParam
      : categories[0]?.slug ?? null
  const selectedCategory = categories.find((c) => c.slug === selectedSlug) ?? categories[0]

  // Fetch products for selected category
  useEffect(() => {
    if (!selectedCategory?.id) {
      setCategoryProducts([])
      return
    }
    setProductsLoading(true)
    fetch(`/api/store/products?categoryId=${encodeURIComponent(selectedCategory.id)}&limit=12`)
      .then((res) => res.json())
      .then((data) => {
        setCategoryProducts(data.products || [])
      })
      .catch(() => setCategoryProducts([]))
      .finally(() => setProductsLoading(false))
  }, [selectedCategory?.id])

  return (
    <div className="flex flex-col w-full min-h-screen bg-background font-sans pb-20 lg:pb-0">
      {/* Header - reference: blue bar, title left, Log in right, search bar below */}
      <div className="bg-primary px-4 pt-4 pb-14 rounded-b-[2rem] relative z-10 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-white font-heading">
            {t('categories')}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="mobile" />
            {user ? (
              <Link
                href="/account"
                className="bg-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-white/30"
              >
                {user.name}
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="bg-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-white/30"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
        <div className="absolute left-4 right-4 -bottom-6 z-10">
          <div className="bg-card rounded-xl shadow-lg p-3 flex items-center gap-3 border border-border">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex-1 flex items-center bg-muted rounded-lg px-3 py-2 gap-2 border border-border/50 text-left"
            >
              <Icon icon="solar:magnifer-linear" className="text-muted-foreground size-5 shrink-0" />
              <span className="flex-1 text-sm text-muted-foreground">
                Search products, brands...
              </span>
            </button>
            <Link href="/cart" className="p-1.5 text-foreground relative flex items-center justify-center" aria-label="Cart">
              <Icon icon="solar:cart-large-2-linear" className="size-6" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Main: left category menu (sticky) + right content */}
      <div className="flex flex-1 mt-10 overflow-hidden min-h-0">
        {/* Left vertical category menu - fixed on scroll */}
        <div className="w-20 lg:w-24 shrink-0 bg-card border-r border-border sticky top-0 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pb-24 scrollbar-thin z-[1]">
          <div className="flex flex-col items-center py-4 gap-4">
            {categories.map((cat) => {
              const translationKey = getCategoryTranslationKey(cat.slug)
              const name = translationKey ? t(translationKey) : cat.name
              const isSelected = selectedSlug === cat.slug
              return (
                <Link
                  key={cat.id}
                  href={`/categories?slug=${encodeURIComponent(cat.slug)}`}
                  className={`flex flex-col items-center gap-1.5 w-full relative py-1 ${
                    isSelected ? '' : 'hover:bg-muted/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                  )}
                  <div
                    className={`size-11 lg:size-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                      isSelected ? 'text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                    style={isSelected ? { backgroundColor: cat.color } : undefined}
                  >
                    <CategoryIcon
                      src={cat.image}
                      alt={name}
                      icon={cat.icon}
                      slug={cat.slug}
                      size={24}
                    />
                  </div>
                  <span
                    className={`text-[10px] text-center font-medium px-0.5 leading-tight max-w-full truncate ${
                      isSelected ? 'text-primary font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right content: selected category banner + subcategories */}
        <div className="flex-1 overflow-y-auto bg-background p-4 pb-24 min-w-0">
          {selectedCategory ? (
            <>
              {/* Featured banner for selected category */}
              <Link
                href={`/categories/${encodeURIComponent(selectedCategory.slug)}`}
                className="block w-full rounded-xl overflow-hidden mb-6 relative h-28 lg:h-32 bg-muted"
              >
                {selectedCategory.image ? (
                  <Image
                    src={selectedCategory.image}
                    alt={selectedCategory.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: selectedCategory.color }}
                  >
                    <CategoryIcon
                      src={null}
                      alt={selectedCategory.name}
                      icon={selectedCategory.icon}
                      slug={selectedCategory.slug}
                      size={56}
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center px-4">
                  <div className="text-white">
                    <h2 className="font-bold text-lg font-heading">
                      {getCategoryTranslationKey(selectedCategory.slug)
                        ? t(getCategoryTranslationKey(selectedCategory.slug)!)
                        : selectedCategory.name}{' '}
                      Collection
                    </h2>
                    <p className="text-[10px] opacity-90">
                      {selectedCategory.description ||
                        `Explore ${selectedCategory.productCount} items`}
                    </p>
                  </div>
                </div>
              </Link>

              {/* Subcategories section */}
              {selectedCategory.subcategories.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-foreground font-heading">
                      Subcategories
                    </h3>
                    <Link
                      href={`/categories/${encodeURIComponent(selectedCategory.slug)}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Icon icon="solar:alt-arrow-right-linear" className="size-4" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedCategory.subcategories.map((sub) => {
                      const subKey = getCategoryTranslationKey(sub.slug)
                      const subName = subKey ? t(subKey) : sub.name
                      return (
                        <Link
                          key={sub.id}
                          href={`/categories/${encodeURIComponent(sub.slug)}`}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="aspect-square w-full rounded-xl border border-border bg-card p-3 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                            <CategoryIcon
                              src={null}
                              alt={subName}
                              icon="solar:box-bold"
                              slug={sub.slug}
                              size={32}
                            />
                          </div>
                          <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight line-clamp-2">
                            {subName}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {/* Products in this category */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground font-heading">
                    Products in this category
                  </h3>
                  <Link
                    href={`/categories/${encodeURIComponent(selectedCategory.slug)}`}
                    className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    View all {selectedCategory.productCount} products
                    <Icon icon="solar:alt-arrow-right-linear" className="size-4" />
                  </Link>
                </div>
                {productsLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="aspect-[4/5] rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : categoryProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={{
                          id: product.id,
                          name: product.name,
                          slug: product.slug,
                          price: product.price,
                          comparePrice: product.comparePrice,
                          rating: product.rating,
                          reviews: product.reviews,
                          image: product.image,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        No products in this category yet
                      </p>
                      <Link
                        href={`/categories/${encodeURIComponent(selectedCategory.slug)}`}
                        className="flex items-center justify-center gap-2 text-primary font-medium text-sm"
                      >
                        View category page
                        <Icon icon="solar:alt-arrow-right-linear" className="size-4" />
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon icon="solar:box-linear" className="size-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No categories found</h3>
              <p className="text-muted-foreground text-center text-sm">
                Categories will appear here once added in admin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
