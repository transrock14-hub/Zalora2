'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { getLanguageForCountry, getLanguageFromBrowser } from '@/lib/country-language'

const countries = [
  { code: 'AT', name: 'Austria' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'US', name: 'USA' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'HN', name: 'Honduras' },
  { code: 'MA', name: 'Morocco' },
]

const features = [
  {
    icon: 'solar:box-bold',
    title: 'Efficient logistics',
    description: 'Lay an efficient logistics network to solve cross-border logistics problems. ZaloraFashion Logistics Service SLS & Localized Fulfillment',
  },
  {
    icon: 'solar:wallet-bold',
    title: 'Safe and fast payment',
    description: 'Sellers can withdraw funds through ZaloraFashion official wallet, or third-party payment service providers LianLian, Payoneer, PingPong. The transaction is safe and fast, and the platform payment cycle is once a week',
  },
  {
    icon: 'solar:monitor-bold',
    title: 'Powerful management platform',
    description: 'The backend provides functions such as batch new products, order tracking, sales reports, etc. One-stop shop to meet store management needs',
  },
  {
    icon: 'solar:chat-round-call-bold',
    title: 'Local customer service',
    description: 'The customer service team is highly localized, covering areas with small languages. Currently providing free customer service to solve language problems',
  },
  {
    icon: 'solar:star-bold',
    title: 'Recommended products',
    description: 'Provide product selection suggestions and operation information every week. Help you gain a deeper understanding of the market, accurately select products, and easily create hot items',
  },
  {
    icon: 'solar:code-bold',
    title: 'API Integration',
    description: 'Connect with domestic mainstream ERP to efficiently manage products and orders. Flexibly customize the backend system that best suits you',
  },
]

// Get flag image URL from flagcdn.com
const getFlagUrl = (countryCode: string) => {
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`
}

export function CountrySelection() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Only check localStorage after component mounts (client-side only)
    if (typeof window === 'undefined') return
    
    // Check if country was already selected - if so, redirect to homepage
    // But only redirect after a small delay to prevent flash
    const countrySelected = localStorage.getItem('country-selected')
    if (countrySelected === 'true') {
      // Small delay to allow page to render first
      const timer = setTimeout(() => {
        router.push('/')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [router])

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode)
    // Store the selection
    localStorage.setItem('selected-country', countryCode)
    localStorage.setItem('country-selected', 'true')
    localStorage.setItem('has-visited', 'true')
    
    // Redirect to homepage after selection
    setTimeout(() => {
      router.push('/')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center">
            <Image
              src="/images/logo.png"
              alt="ZALORA"
              width={160}
              height={50}
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-6xl">
        {/* Title Section */}
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
            Select Your Country
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            ZaloraFashion is available in the following countries
          </p>
        </div>

        {/* Country Grid - Compact Design */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 lg:gap-4 mb-12">
          {countries.map((country) => (
            <button
              key={country.code}
              onClick={() => handleCountrySelect(country.code)}
              className={`
                relative flex flex-col items-center gap-2 p-3 lg:p-4 rounded-lg border transition-all
                hover:border-blue-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                ${selectedCountry === country.code 
                  ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-600/20' 
                  : 'border-gray-200 bg-white hover:bg-gray-50'
                }
              `}
            >
              {/* Flag Image */}
              <div className={`
                relative w-12 h-9 lg:w-14 lg:h-10 rounded overflow-hidden
                transition-all duration-200
                ${selectedCountry === country.code ? 'ring-2 ring-blue-600/30' : ''}
              `}>
                <Image
                  src={getFlagUrl(country.code)}
                  alt={`${country.name} flag`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              
              {/* Country name */}
              <span className={`
                text-xs lg:text-sm font-medium text-center leading-tight
                ${selectedCountry === country.code ? 'text-blue-600' : 'text-gray-700'}
              `}>
                {country.name}
              </span>
              
              {/* Selected checkmark */}
              {selectedCountry === country.code && (
                <div className="absolute top-1.5 right-1.5">
                  <div className="bg-blue-600 rounded-full p-0.5">
                    <Icon icon="solar:check-bold" className="size-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Features Section - Compact */}
        <div className="mb-10">
          <div className="text-center mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
              Why Choose ZaloraFashion?
            </h2>
            <p className="text-gray-600 text-sm">
              Professional cross-border solutions for your business
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 border border-gray-200/60 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon icon={feature.icon} className="size-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1.5 text-gray-900">{feature.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skip Button */}
        <div className="text-center pt-4 pb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              localStorage.setItem('country-selected', 'true')
              localStorage.setItem('has-visited', 'true')
              // Use browser language so site still appears in their language
              const lang = getLanguageFromBrowser()
              localStorage.setItem('preferred-language', lang)
              router.push('/')
            }}
            className="min-w-[180px] border-gray-300 hover:bg-gray-50"
          >
            Skip for now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200/60 bg-white py-4">
        <div className="container mx-auto px-4 text-center text-xs text-gray-500">
          Copyright © 2023-2026 ZaloraFashion. All rights reserved.
        </div>
      </div>
    </div>
  )
}
