'use client'

import { Icon } from '@iconify/react'
import Image from 'next/image'
import Link from 'next/link'
import { useUserStore, useCartStore } from '@/lib/store'
import { HeroSlider } from '@/components/hero-slider'
import { CategoryIcon } from '@/components/category-icon'
import { ProductSlider } from '@/components/product-slider'
import { ScrollingText } from '@/components/scrolling-text'
import { useLanguage } from '@/contexts/language-context'
import { getCategoryTranslationKey } from '@/lib/category-translations'
import { LanguageSelector } from '@/components/language-selector'
import { useUIStore } from '@/lib/store'

interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  image: string | null
  color: string
  iconColor: string
}

interface Product {
  id: string
  name: string
  price: number
  comparePrice: number | null
  rating: number
  reviews: number
  image: string
  slug: string
}

interface HeroSlide {
  id: string
  title: string | null
  subtitle: string | null
  image: string
  mobileImage: string | null
  ctaText: string | null
  ctaLink: string | null
}

interface HomePageClientProps {
  categories: Category[]
  featuredProducts: Product[]
  newArrivals: Product[]
  heroSlides: HeroSlide[]
}

export function HomePageClient({
  categories,
  featuredProducts,
  newArrivals,
  heroSlides,
}: HomePageClientProps) {
  const { t } = useLanguage()
  const user = useUserStore((state) => state.user)
  const cartCount = useCartStore((state) => state.getItemCount())
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)

  return (
    <div className="flex flex-col w-full h-full bg-background font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="bg-primary px-4 pt-4 pb-12 rounded-b-[2rem] relative z-0 lg:hidden flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="ZALORA"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="mobile" />
            {user ? (
              <Link
                href="/account"
                className="flex items-center gap-2 bg-[#0D47A1] text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-white/20 truncate max-w-[140px]"
                title={user.name}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="size-7 rounded-full object-cover shrink-0" />
                ) : (
                  <Icon icon="solar:user-circle-linear" className="size-5 shrink-0" />
                )}
                <span className="truncate">{user.name || t('account')}</span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="bg-[#0D47A1] text-white text-xs font-semibold px-4 py-1.5 rounded-md"
              >
                {t('login')}
              </Link>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-6 text-white">
          <div className="flex flex-col">
            <div className="text-sm font-medium opacity-90">{t('megaSaleEvent')}</div>
            <div className="flex items-center gap-1">
              <span className="text-accent font-bold text-lg font-heading">{t('bestDeals')}</span>
              <div className="bg-accent text-accent-foreground rounded-full size-4 flex items-center justify-center">
                <Icon icon="solar:arrow-right-linear" className="size-3" />
              </div>
            </div>
          </div>
          <div className="relative bg-accent text-accent-foreground px-3 py-1 rounded-sm shadow-sm flex items-center gap-1">
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 size-2 bg-accent rotate-45" />
            <Icon icon="solar:calendar-bold" className="size-4" />
            <span className="text-xs font-bold whitespace-nowrap">WEEKEND SALE</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="absolute left-4 right-4 -bottom-6 z-10">
          <div className="bg-card rounded-xl shadow-lg p-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex-1 flex items-center bg-input rounded-lg px-3 py-2 gap-2 border border-border/50 text-left"
            >
              <Icon icon="solar:magnifer-linear" className="text-muted-foreground size-5 shrink-0" />
              <span className="flex-1 text-sm text-muted-foreground truncate">{t('searchProducts')}</span>
            </button>
            <Link href="/cart" className="p-1 relative">
              <Icon icon="solar:cart-large-2-linear" className="size-6 text-foreground" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 mt-10 lg:mt-0 overflow-y-auto">
        {/* Container for all sections - ensures alignment */}
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl py-4">
          {/* Hero Slider - Mobile */}
          <div className="lg:hidden rounded-lg overflow-hidden mb-4 shadow-sm border border-gray-200/60">
            <HeroSlider slides={heroSlides} autoPlayInterval={4000} />
          </div>

          {/* Hero Slider - Desktop (single full-width image; no side banner) */}
          <div className="hidden lg:block rounded-lg overflow-hidden mb-4 shadow-sm border border-gray-200/60 bg-white">
            <HeroSlider slides={heroSlides} autoPlayInterval={4000} />
          </div>

          {/* Categories Quick Links - Horizontal slider/scroller below Hero */}
          <div className="mb-4 bg-white border border-gray-200/60 rounded-lg p-4 shadow-sm">
            <div className="flex gap-5 lg:gap-6 overflow-x-auto scrollbar-hide justify-start lg:justify-start snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1">
              {categories.map((category) => {
                const slug = (category.slug || category.name || '')
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '') || category.id
                const translationKey = getCategoryTranslationKey(category.slug || slug)
                const categoryName = translationKey ? t(translationKey) : category.name
                
                return (
                  <Link
                    key={category.id}
                    href={`/categories?slug=${encodeURIComponent(category.slug || slug)}`}
                    className="flex flex-col items-center gap-2 group flex-shrink-0 snap-center"
                  >
                    <div
                      className="size-12 lg:size-14 rounded-full flex items-center justify-center transition-all group-hover:scale-105 overflow-hidden relative bg-white border border-gray-200/60 shadow-sm"
                    >
                      <CategoryIcon
                        src={category.image}
                        alt={categoryName}
                        icon={category.icon}
                        slug={category.slug}
                        size={36}
                      />
                    </div>
                    <span className="text-[11px] lg:text-xs text-center text-gray-600 font-normal whitespace-nowrap leading-tight">
                      {categoryName}
                    </span>
                  </Link>
                )
              })}
              
              {/* More Button - Mobile Only */}
              <Link
                href="/categories"
                className="lg:hidden flex flex-col items-center gap-2 group flex-shrink-0"
              >
                <div className="size-12 rounded-full flex items-center justify-center transition-all group-hover:scale-105 relative bg-gray-100 border border-gray-200/60 shadow-sm">
                  <Icon icon="solar:menu-dots-circle-bold" className="size-6 text-gray-600" />
                </div>
                <span className="text-[11px] text-center text-gray-600 font-normal whitespace-nowrap leading-tight">
                  {t('more')}
                </span>
              </Link>
            </div>
          </div>

          {/* Scrolling Text Banner - Below Categories */}
          <ScrollingText className="mb-4" />

          {/* Hot Selling Products */}
          <div className="mb-4">
            <ProductSlider 
              products={featuredProducts}
              title={t('hotSelling')}
              viewAllLink="/products?sort=popular"
            />
          </div>

          {/* New Arrivals */}
          <div className="mb-4">
            <ProductSlider 
              products={newArrivals}
              title={t('newArrivals')}
              viewAllLink="/products?sort=newest"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
