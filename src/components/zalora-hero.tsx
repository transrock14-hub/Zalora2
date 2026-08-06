'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'

interface HeroSlide {
  id: string
  title: string | null
  subtitle: string | null
  image: string
  mobileImage: string | null
  ctaText: string | null
  ctaLink: string | null
}

interface HeroProduct {
  id: string
  name: string
  price: number
  image: string
  slug: string
}

interface ZaloraHeroProps {
  slides: HeroSlide[]
  products?: HeroProduct[]
  autoPlayInterval?: number
}

/**
 * Editorial hero carousel in the zalora.com.ph style:
 * full-bleed photo, left uppercase serif headline block, floating product
 * cards on the right, black "SHOP NOW" pill and dash pagination.
 */
export function ZaloraHero({ slides, products = [], autoPlayInterval = 5000 }: ZaloraHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [])

  const pauseThenResume = useCallback(() => {
    setIsAutoPlaying(false)
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setIsAutoPlaying(true), 10000)
  }, [])

  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, autoPlayInterval)
    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length, autoPlayInterval])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    pauseThenResume()
  }
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
    pauseThenResume()
  }
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
    pauseThenResume()
  }

  if (slides.length === 0) {
    return (
      <div className="w-full h-[320px] lg:h-[460px] bg-neutral-100 flex items-center justify-center">
        <p className="text-neutral-400 text-sm tracking-widest uppercase">No slides available</p>
      </div>
    )
  }

  const slide = slides[currentIndex]
  const imageSrc = isMobile && slide.mobileImage ? slide.mobileImage : slide.image

  // Rotate which products appear with each slide
  const cards = products.length
    ? Array.from({ length: Math.min(4, products.length) }, (_, i) => {
        return products[(currentIndex * 2 + i) % products.length]
      })
    : []

  return (
    <div className="relative w-full group bg-white overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="relative w-full h-[340px] lg:h-[480px]"
        >
          {/* Background photo */}
          <Image
            src={imageSrc}
            alt={slide.title || 'Banner'}
            fill
            className="object-cover"
            sizes="100vw"
            priority={currentIndex === 0}
            unoptimized
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder-product.jpg'
            }}
          />
          {/* Soft light wash on the left for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />

          {/* Editorial text block — left */}
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center pl-6 lg:pl-16 pr-6 max-w-[560px]">
            {slide.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-[11px] lg:text-xs mb-3 tracking-[0.35em] uppercase text-white font-medium"
              >
                {slide.subtitle}
              </motion.p>
            )}
            {slide.title && (
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="font-serif text-3xl lg:text-[3.4rem] leading-[1.05] font-bold uppercase text-white mb-5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
              >
                {slide.title}
              </motion.h2>
            )}
            {slide.ctaText && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Link
                  href={slide.ctaLink || '/products'}
                  className="inline-flex items-center gap-1 bg-white text-neutral-900 text-[11px] lg:text-xs font-semibold uppercase tracking-[0.18em] px-6 lg:px-8 py-3 rounded-full hover:bg-neutral-900 hover:text-white transition-colors w-fit"
                >
                  {slide.ctaText}
                  <Icon icon="solar:alt-arrow-right-linear" className="size-3.5" />
                </Link>
              </motion.div>
            )}
          </div>

          {/* Floating product cards — right (desktop only) */}
          {cards.length > 0 && (
            <div className="absolute inset-y-0 right-10 xl:right-16 hidden lg:flex items-center gap-3">
              {cards.map((p, i) => (
                <motion.div
                  key={`${slide.id}-${p.id}`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                >
                  <Link
                    href={`/products/${p.slug}`}
                    className="block w-[120px] xl:w-[136px] bg-white rounded-md overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.18)] hover:-translate-y-1 transition-transform"
                  >
                    <div className="relative w-full aspect-[3/4] bg-neutral-50">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="136px"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-product.jpg'
                        }}
                      />
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] text-neutral-800 truncate">{p.name}</p>
                      <p className="text-[11px] font-semibold text-neutral-900">
                        ${p.price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 h-16 w-9 bg-white/85 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Previous slide"
          >
            <Icon icon="solar:alt-arrow-left-linear" className="size-5 text-neutral-900" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-16 w-9 bg-white/85 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Next slide"
          >
            <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-neutral-900" />
          </button>

          {/* Dash pagination */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-[3px] rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-7 bg-white'
                    : 'w-3.5 bg-white/45 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Thin promo strip like the zalora.com.ph announcement bar. */
export function AnnouncementBar() {
  const items = [
    {
      icon: 'solar:box-linear',
      text: '30 Days Free Returns',
      sub: 'T&C Apply',
      href: '/about',
    },
    {
      icon: 'solar:crown-linear',
      text: 'Become a ZALORA VIP today!',
      sub: '',
      href: '/account',
      vip: true,
    },
    {
      icon: 'solar:smartphone-linear',
      text: 'Save more on ZALORA!',
      sub: '25% Off + Free Shipping',
      href: '/deals',
    },
  ]
  return (
    <div className="hidden lg:flex w-full bg-neutral-50 border-b border-neutral-200 text-neutral-800">
      <div className="container mx-auto max-w-7xl px-6 grid grid-cols-3">
        {items.map((it, i) => (
          <Link
            key={i}
            href={it.href}
            className={`flex items-center justify-center gap-2 py-2 text-[11px] tracking-wide hover:bg-neutral-100 transition-colors ${
              i < items.length - 1 ? 'border-r border-neutral-200' : ''
            }`}
          >
            {it.vip ? (
              <span className="bg-gradient-to-r from-violet-600 to-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                VIP
              </span>
            ) : (
              <Icon icon={it.icon} className="size-3.5 text-neutral-700" />
            )}
            <span className="font-medium">{it.text}</span>
            {it.sub && <span className="text-neutral-500">{it.sub}</span>}
            <Icon icon="solar:alt-arrow-right-linear" className="size-3 text-neutral-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
