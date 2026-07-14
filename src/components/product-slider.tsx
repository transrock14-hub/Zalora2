'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { ProductCard } from './product-card'
import { useLanguage } from '@/contexts/language-context'

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

interface ProductSliderProps {
  products: Product[]
  title: string
  viewAllLink?: string
}

export function ProductSlider({ products, title, viewAllLink = '/products' }: ProductSliderProps) {
  const { t } = useLanguage()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', checkScroll)
      return () => container.removeEventListener('scroll', checkScroll)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      const newScrollLeft = direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative bg-white border border-gray-200/60 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
        <Link href={viewAllLink} className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-normal transition-colors">
          {t('viewAll')}
        </Link>
      </div>

      <div className="relative group">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 border border-gray-200"
          >
            <Icon icon="solar:alt-arrow-left-linear" className="size-4 text-gray-700" />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 transition-all opacity-0 group-hover:opacity-100 border border-gray-200"
          >
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-gray-700" />
          </button>
        )}

        {/* Products Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[160px] lg:w-[200px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
