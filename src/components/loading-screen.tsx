'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'

export function LoadingScreen() {
  const [showLanding, setShowLanding] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false) // Start as false, will be set to true if needed
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    
    // Only check localStorage after component mounts (client-side only)
    if (typeof window === 'undefined') return
    
    // Check if user has already seen the welcome page
    const hasSeenWelcome = localStorage.getItem('has-seen-welcome')
    const isCountryPage = pathname === '/select-country'
    const isHomePage = pathname === '/'

    // Don't show welcome page on country selection or other pages
    if (isCountryPage || !isHomePage) {
      setShowLanding(false)
      setIsAnimating(false)
      setIsRedirecting(false)
      return
    }

    // Show welcome page ONLY for first-time visitors (not on reload)
    if (!hasSeenWelcome) {
      // Show loading animation first
      setIsAnimating(true)
      setShowLanding(false)
      
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setShowLanding(true)
      }, 1500)

      return () => clearTimeout(timer)
    } else {
      // Hide immediately for returning visitors or on reload
      setShowLanding(false)
      setIsAnimating(false)
      setIsRedirecting(false)
    }
  }, [pathname])

  // Don't render anything until mounted (prevents hydration issues)
  if (!mounted) {
    return null
  }

  const handleSettleIn = () => {
    // Mark that we're redirecting to prevent flash
    setIsRedirecting(true)
    // Mark that user has seen the welcome page (prevents showing on reload)
    localStorage.setItem('has-seen-welcome', 'true')
    // Use window.location for immediate redirect (prevents homepage flash)
    window.location.href = '/select-country'
  }

  // Don't show anything if not needed
  if (!isAnimating && !showLanding && !isRedirecting) return null

  // Show initial loading animation
  if (isAnimating && !showLanding && !isRedirecting) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]">
        <div className="relative w-[200px] h-[200px] flex items-center justify-center">
          {/* Spinning Ring */}
          <div className="absolute inset-0 spinning-ring"></div>
          {/* ZALORA Logo in center */}
          <Image
            src="/images/logo.png"
            alt="ZALORA Logo"
            width={80}
            height={80}
            className="object-contain z-10"
          />
        </div>
      </div>
    )
  }

  // Show landing page with content
  return (
    <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary/10 via-white to-blue-50 py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Image
                src="/images/logo.png"
                alt="ZALORA Logo"
                width={200}
                height={80}
                className="object-contain"
                priority
              />
            </div>

            {/* Hero Sliders */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <HeroMiniSlider
                slides={[
                  { text: 'Settle In Now', subtext: 'Start Your Business' },
                  { text: 'Join Today', subtext: 'Grow Your Brand' },
                  { text: 'Begin Selling', subtext: 'Reach Global Market' },
                ]}
                onClick={handleSettleIn}
              />
              <HeroMiniSlider
                slides={[
                  { text: 'Settle In Now', subtext: '0% Commission Start' },
                  { text: 'Free Setup', subtext: 'No Hidden Fees' },
                  { text: 'Quick Launch', subtext: 'In 24 Hours' },
                ]}
                onClick={handleSettleIn}
                delay={1000}
              />
              <HeroMiniSlider
                slides={[
                  { text: 'Settle In Now', subtext: 'Join 1000+ Sellers' },
                  { text: 'Proven Success', subtext: 'Real Results' },
                  { text: 'Start Earning', subtext: 'Today' },
                ]}
                onClick={handleSettleIn}
                delay={2000}
              />
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4">
              Pilot Cross border E-commerce Platform
            </h1>
            <p className="text-2xl lg:text-3xl text-primary font-semibold mb-12">
              Massive Business Opportunities At Your Fingertips
            </p>

            {/* Main CTA */}
            <Button
              size="lg"
              onClick={handleSettleIn}
              className="px-12 py-6 text-xl font-bold rounded-lg shadow-2xl hover:shadow-3xl transition-all hover:scale-105 mb-16"
            >
              Settle In Now
              <Icon icon="solar:arrow-right-bold" className="ml-2 size-6" />
            </Button>

            {/* Statistics */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="text-5xl font-bold text-primary mb-2">10+</div>
                <div className="text-sm text-muted-foreground">Market Championship</div>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="text-5xl font-bold text-primary mb-2">#2</div>
                <div className="text-sm text-muted-foreground">Market Shopping App</div>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="text-5xl font-bold text-primary mb-2">76.1B</div>
                <div className="text-sm text-muted-foreground">Total Order Volume In 2025</div>
              </div>
            </div>
          </div>
        </section>

        {/* Big Weapons Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl lg:text-5xl font-bold text-center mb-4">
              3 Big Weapon
            </h2>
            <p className="text-xl text-primary font-semibold text-center mb-12">
              Zalora Fashion Marketing Matrix
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Weapon 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon icon="solar:user-speak-bold" className="size-10 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-4 text-center">Delegated Incubation Manager</h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  Equipped with a professional incubation manager, who can answer the questions of novices in detail, customize the growth path, and serve you intimately
                </p>
              </div>

              {/* Weapon 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon icon="solar:rocket-bold" className="size-10 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-4 text-center">Activity Exposure Resources</h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  Cross-border sellers enjoy a large number of event exposure resources to help you start easily and grow quickly
                </p>
              </div>

              {/* Weapon 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Icon icon="solar:wallet-bold" className="size-10 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-4 text-center">Commission Discount, Freight Subsidy</h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  0 Service Fee, 0 Annual Fee, Commission as low as 6%
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Button
                size="lg"
                onClick={handleSettleIn}
                className="px-10 py-5 text-lg font-bold rounded-lg"
              >
                Sign In Now - Big Interest
              </Button>
            </div>
          </div>
        </section>

        {/* Seller Stories Section */}
        <section className="py-20 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl lg:text-5xl font-bold text-center mb-4">
              Seller Story
            </h2>
            <p className="text-xl text-muted-foreground text-center mb-12">
              Leading Cross border Seller In The Industry
            </p>

            <SellerStoriesSlider />
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-primary to-primary/80">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8">
              Join now and share growth with ZaloraFashion!
            </h2>
            <Button
              size="lg"
              onClick={handleSettleIn}
              variant="secondary"
              className="px-12 py-6 text-xl font-bold rounded-lg shadow-2xl hover:scale-105 transition-all"
            >
              Settle In Now
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 px-4 bg-gray-900 text-white text-center">
          <p className="text-sm">Copyright © 2023-2026 ZaloraFashion. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}

// Hero Mini Slider Component
function HeroMiniSlider({ 
  slides, 
  onClick, 
  delay = 0 
}: { 
  slides: { text: string; subtext: string }[]
  onClick: () => void
  delay?: number
}) {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      }, 3000)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(timer)
  }, [slides.length, delay])

  return (
    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-primary/20 overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer group" onClick={onClick}>
      <div className="relative h-24">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-500 flex flex-col items-center justify-center ${
              currentSlide === index
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="text-2xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform">
              {slide.text}
            </div>
            <div className="text-sm text-muted-foreground">
              {slide.subtext}
            </div>
          </div>
        ))}
      </div>

      {/* Slide Indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all ${
              currentSlide === index ? 'bg-primary w-6' : 'bg-gray-300 w-1.5'
            }`}
          />
        ))}
      </div>

      {/* Arrow Icon */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Icon icon="solar:arrow-right-bold" className="size-5 text-primary" />
      </div>
    </div>
  )
}

// Seller Stories Slider Component
function SellerStoriesSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const stories = [
    {
      category: 'Electronics - Bluetooth Headset',
      year: '2019',
      title: 'SOUNDPEATS',
      description: 'SOUNDPEATS has been deeply involved in the headphone industry for more than ten years. In 2019, the brand sensed overseas business opportunities and started from scratch, operating the ZaloraFashion Southeast Asian market. In 2021, it achieved sales of nearly US$80,000 on the day of the 12.12 promotion.',
    },
    {
      category: 'FMCG - Beauty And Health Care',
      year: '2019',
      title: 'Perfect Diary',
      description: 'In April 2021, Perfect Diary ranked first in sales of ZaloraFashion cosmetics in Singapore and Vietnam, ranked first in sales of ZaloraFashion\'s lip makeup category in the Malaysian market, and ranked first in sales of ZaloraFashion\'s loose powder category in the Philippine market.',
    },
    {
      category: 'Lifestyle - Outdoor Sports',
      year: '2022',
      title: 'Camel Crown',
      description: 'Camel Crown is a camping equipment brand owned by Camel, and Southeast Asia is an important strategic market for the brand to go overseas. Since entering ZaloraFashion, Camel Crown\'s sales have grown steadily, and its order volume soared 10 times on the day of ZaloraFashion\'s 11.11 promotion last year.',
    },
    {
      category: 'Fashion - Ladies Bag',
      year: '2020',
      title: 'Huang Tianxiang',
      description: 'After graduating, the 24-year-old Huang Tianxiang settled in ZaloraFashion and became a top seller in the luggage category. In 2021, the 11.11 sales exceeded 7,000 orders per day. The "special" thing about him is that he is a patient with the congenital chronic disease SMA spinal muscular atrophy.',
    },
    {
      category: 'FMCG - Beauty And Health Care',
      year: '2017',
      title: 'Focallure',
      description: 'Focallure settled in ZaloraFashion in 2017. The 11.11 and 12.12 sales in 2021 and this year\'s 315 consumer sales have continued to rank second in the sales volume of beauty brands in Southeast Asia on the platform. The annual turnover has increased by more than three times.',
    },
    {
      category: 'Electronics - Mobile Phone',
      year: '2018',
      title: 'Xiaomi',
      description: 'Xiaomi will exclusively launch a number of new phones on ZaloraFashion in 2021, becoming the number one mobile phone brand on the platform throughout the year. On the eve of the 11.11 promotion, the best-selling model POCO X3 Pro has been made into the strongest model.',
    },
    {
      category: 'Fashion - Women\'s Shoes',
      year: '2019',
      title: 'POSEE',
      description: 'POSEE 2019 moved from China to Southeast Asia, winning the first place in cross-border sales of women\'s shoes in the Thai market, and its "shit-feeling slippers" became a hot item. Currently, the entire ZaloraFashion market has been opened, with over 5,000 orders placed every day.',
    },
  ]

  const visibleStories = 3
  const maxIndex = stories.length - visibleStories

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))
  }

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * (100 / visibleStories)}%)` }}
        >
          {stories.map((story, index) => (
            <div
              key={index}
              className="w-full md:w-1/3 flex-shrink-0 px-4"
            >
              <div className="bg-gray-50 rounded-2xl p-6 h-full shadow-lg hover:shadow-2xl transition-shadow">
                <div className="text-primary font-semibold text-sm mb-2">{story.category}</div>
                <div className="text-xs text-muted-foreground mb-4">Settled In {story.year}</div>
                <h3 className="font-bold text-xl mb-4">{story.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {story.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
      >
        <Icon icon="solar:alt-arrow-left-bold" className="size-6 text-foreground" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
      >
        <Icon icon="solar:alt-arrow-right-bold" className="size-6 text-foreground" />
      </button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              currentIndex === index ? 'bg-primary w-8' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
