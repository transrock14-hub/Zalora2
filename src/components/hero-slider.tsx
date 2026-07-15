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

interface HeroSliderProps {
  slides: HeroSlide[]
  autoPlayInterval?: number
}

export function HeroSlider({ slides, autoPlayInterval = 4500 }: HeroSliderProps) {
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
      <div className="w-full h-[320px] lg:h-[420px] bg-muted flex items-center justify-center rounded-xl">
        <p className="text-muted-foreground">No slides available</p>
      </div>
    )
  }

  const slide = slides[currentIndex]
  const imageSrc =
    isMobile && slide.mobileImage ? slide.mobileImage : slide.image

  return (
    <div className="relative w-full group rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -48 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="relative w-full h-[260px] lg:h-[420px]"
        >
          <Link
            href={slide.ctaLink || '/deals'}
            className="relative block w-full h-full overflow-hidden"
          >
            <Image
              src={imageSrc}
              alt={slide.title || 'Banner'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1200px"
              priority={currentIndex === 0}
              unoptimized
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/placeholder-product.jpg'
              }}
            />

            {(slide.title || slide.subtitle || slide.ctaText) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-8 pointer-events-none bg-gradient-to-t from-black/35 via-transparent to-black/10">
                {slide.subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-xs mb-2 tracking-[0.22em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                  >
                    {slide.subtitle}
                  </motion.p>
                )}
                {slide.title && (
                  <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-2xl lg:text-4xl font-semibold mb-4 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)] leading-tight max-w-3xl"
                  >
                    {slide.title}
                  </motion.h2>
                )}
                {slide.ctaText && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="pointer-events-auto"
                  >
                    <span className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-gray-900 text-sm font-medium shadow-md hover:shadow-lg transition-shadow">
                      {slide.ctaText}
                    </span>
                  </motion.div>
                )}
              </div>
            )}

            <div className="absolute bottom-4 right-4 opacity-60 z-10 pointer-events-none">
              <div className="text-white text-right drop-shadow-lg">
                <div className="text-xs mb-1">From</div>
                <div className="text-lg font-bold font-heading">ZALORA</div>
              </div>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 size-10 lg:size-12 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Previous slide"
          >
            <Icon icon="solar:arrow-left-bold" className="size-5 lg:size-6 text-gray-800" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 size-10 lg:size-12 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Next slide"
          >
            <Icon icon="solar:arrow-right-bold" className="size-5 lg:size-6 text-gray-800" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all shadow-lg ${
                  index === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/50 hover:bg-white/75'
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
