'use client'

import { useState, useEffect } from 'react'
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

export function HeroSlider({ slides, autoPlayInterval = 5000 }: HeroSliderProps) {
  // Group slides into pairs for desktop (2 images per slide)
  const slidePairs: Array<[HeroSlide, HeroSlide | null]> = []
  for (let i = 0; i < slides.length; i += 2) {
    slidePairs.push([slides[i], slides[i + 1] || null])
  }
  
  const [currentPairIndex, setCurrentPairIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying || slidePairs.length <= 1) return

    const interval = setInterval(() => {
      setCurrentPairIndex((prev) => (prev + 1) % slidePairs.length)
    }, autoPlayInterval)

    return () => clearInterval(interval)
  }, [isAutoPlaying, slidePairs.length, autoPlayInterval])

  const goToSlide = (index: number) => {
    setCurrentPairIndex(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000) // Resume after 10s
  }

  const nextSlide = () => {
    setCurrentPairIndex((prev) => (prev + 1) % slidePairs.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const prevSlide = () => {
    setCurrentPairIndex((prev) => (prev - 1 + slidePairs.length) % slidePairs.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  if (slides.length === 0) {
    return (
      <div className="w-full h-[400px] lg:h-[500px] bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No slides available</p>
      </div>
    )
  }

  const [currentSlide, secondSlide] = slidePairs[currentPairIndex]
  // For mobile, use single slide index
  const [mobileIndex, setMobileIndex] = useState(0)
  
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return
    const interval = setInterval(() => {
      setMobileIndex((prev) => (prev + 1) % slides.length)
    }, autoPlayInterval)
    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length, autoPlayInterval])

  return (
    <div className="relative w-full group rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white overflow-hidden">
      {/* Mobile: Single Image Slider */}
      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={mobileIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-[260px]"
          >
            <Image
              src={slides[mobileIndex].mobileImage || slides[mobileIndex].image}
              alt={slides[mobileIndex].title || 'Slide'}
              width={1200}
              height={600}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement
                target.src = '/placeholder-product.jpg'
              }}
              priority={mobileIndex === 0}
              unoptimized
            />
            
            {/* Overlay Content - Mobile */}
            {(slides[mobileIndex].title || slides[mobileIndex].subtitle || slides[mobileIndex].ctaText) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 py-8 pointer-events-none">
                {slides[mobileIndex].subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs mb-2 tracking-[0.22em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
                  >
                    {slides[mobileIndex].subtitle}
                  </motion.p>
                )}
                {slides[mobileIndex].title && (
                  <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-semibold mb-4 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)] leading-tight"
                  >
                    {slides[mobileIndex].title}
                  </motion.h2>
                )}
                {slides[mobileIndex].ctaText && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="pointer-events-auto"
                  >
                    <Link
                      href={slides[mobileIndex].ctaLink || '/deals'}
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-gray-900 text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
                    >
                      {slides[mobileIndex].ctaText}
                    </Link>
                  </motion.div>
                )}
              </div>
            )}

            {/* From Zalora Watermark - Mobile */}
            <div className="absolute bottom-4 right-4 opacity-60 z-10">
              <div className="text-white text-right drop-shadow-lg">
                <div className="text-xs mb-1">From</div>
                <div className="text-lg font-bold font-heading">ZALORA</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop: Two Images Side-by-Side */}
      <div className="hidden lg:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPairIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-[420px] grid grid-cols-2 gap-2"
          >
            {/* First Image */}
            <Link
              href={currentSlide.ctaLink || '#'}
              className="relative w-full h-full overflow-hidden rounded-lg group/image"
            >
              <Image
                src={currentSlide.image}
                alt={currentSlide.title || 'Banner'}
                width={800}
                height={420}
                className="w-full h-full object-cover"
                priority={currentPairIndex === 0}
                unoptimized
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-product.jpg'
                }}
              />
              
              {/* Overlay Content - First Image */}
              {(currentSlide.title || currentSlide.subtitle || currentSlide.ctaText) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 py-6 pointer-events-none">
                  {currentSlide.subtitle && (
                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs mb-2 tracking-[0.15em] uppercase text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                    >
                      {currentSlide.subtitle}
                    </motion.p>
                  )}
                  {currentSlide.title && (
                    <motion.h2
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl lg:text-2xl font-semibold mb-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] leading-tight"
                    >
                      {currentSlide.title}
                    </motion.h2>
                  )}
                  {currentSlide.ctaText && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="pointer-events-auto"
                    >
                      <span className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-white text-gray-900 text-sm font-medium shadow-md hover:shadow-lg transition-shadow">
                        {currentSlide.ctaText}
                      </span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* From Zalora Watermark - First Image */}
              <div className="absolute bottom-3 right-3 opacity-60 z-10">
                <div className="text-white text-right drop-shadow-lg">
                  <div className="text-[10px] mb-0.5">From</div>
                  <div className="text-sm font-bold font-heading">ZALORA</div>
                </div>
              </div>
            </Link>

            {/* Second Image (or placeholder if odd number of slides) */}
            {secondSlide ? (
              <Link
                href={secondSlide.ctaLink || '#'}
                className="relative w-full h-full overflow-hidden rounded-lg group/image"
              >
                <Image
                  src={secondSlide.image}
                  alt={secondSlide.title || 'Banner'}
                  width={800}
                  height={420}
                  className="w-full h-full object-cover"
                  priority={currentPairIndex === 0}
                  unoptimized
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder-product.jpg'
                  }}
                />
                
                {/* Overlay Content - Second Image */}
                {(secondSlide.title || secondSlide.subtitle || secondSlide.ctaText) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 py-6 pointer-events-none">
                    {secondSlide.subtitle && (
                      <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xs mb-2 tracking-[0.15em] uppercase text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                      >
                        {secondSlide.subtitle}
                      </motion.p>
                    )}
                    {secondSlide.title && (
                      <motion.h2
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl lg:text-2xl font-semibold mb-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] leading-tight"
                      >
                        {secondSlide.title}
                      </motion.h2>
                    )}
                    {secondSlide.ctaText && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="pointer-events-auto"
                      >
                        <span className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-white text-gray-900 text-sm font-medium shadow-md hover:shadow-lg transition-shadow">
                          {secondSlide.ctaText}
                        </span>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* From Zalora Watermark - Second Image */}
                <div className="absolute bottom-3 right-3 opacity-60 z-10">
                  <div className="text-white text-right drop-shadow-lg">
                    <div className="text-[10px] mb-0.5">From</div>
                    <div className="text-sm font-bold font-heading">ZALORA</div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="relative w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">Coming Soon</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows - Desktop */}
      {slidePairs.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 size-10 lg:size-12 rounded-full bg-white/90 hover:bg-white shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Previous slide"
          >
            <Icon icon="solar:arrow-left-bold" className="size-5 lg:size-6 text-gray-800" />
          </button>
          <button
            onClick={nextSlide}
            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 size-10 lg:size-12 rounded-full bg-white/90 hover:bg-white shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Next slide"
          >
            <Icon icon="solar:arrow-right-bold" className="size-5 lg:size-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Navigation Arrows - Mobile */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => {
              setMobileIndex((prev) => (prev - 1 + slides.length) % slides.length)
              setIsAutoPlaying(false)
              setTimeout(() => setIsAutoPlaying(true), 10000)
            }}
            className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Previous slide"
          >
            <Icon icon="solar:arrow-left-bold" className="size-5 text-gray-800" />
          </button>
          <button
            onClick={() => {
              setMobileIndex((prev) => (prev + 1) % slides.length)
              setIsAutoPlaying(false)
              setTimeout(() => setIsAutoPlaying(true), 10000)
            }}
            className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Next slide"
          >
            <Icon icon="solar:arrow-right-bold" className="size-5 text-gray-800" />
          </button>
        </>
      )}

      {/* Dots Indicator - Desktop (shows pairs) */}
      {slidePairs.length > 1 && (
        <div className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 gap-2 z-20">
          {slidePairs.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all shadow-lg ${
                index === currentPairIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Dots Indicator - Mobile */}
      {slides.length > 1 && (
        <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setMobileIndex(index)
                setIsAutoPlaying(false)
                setTimeout(() => setIsAutoPlaying(true), 10000)
              }}
              className={`h-2 rounded-full transition-all shadow-lg ${
                index === mobileIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Auto-play indicator */}
      {isAutoPlaying && ((slidePairs.length > 1) || (slides.length > 1)) && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2 z-20 shadow-lg">
          <Icon icon="solar:play-circle-bold" className="size-4" />
          Auto
        </div>
      )}
    </div>
  )
}
