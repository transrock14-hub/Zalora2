'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { getCategoryTranslationKey } from '@/lib/category-translations'

interface Category {
  id: string
  name: string
  slug: string
  icon?: string | null
  image?: string | null
}

interface StoreSidebarProps {
  categories: Category[]
}

function CategoryIconImage({ 
  src, 
  slug, 
  icon, 
  alt 
}: { 
  src: string | null | undefined
  slug: string
  icon: string | null | undefined
  alt: string
}) {
  const [hasError, setHasError] = useState(false)
  const [staticImageError, setStaticImageError] = useState(false)

  // Priority: uploaded image -> static image in public/images/categories -> icon font
  const imageSrc = src || `/images/categories/${slug}.png`

  // If both uploaded and static images fail, show icon
  if ((hasError && staticImageError) || (!src && staticImageError)) {
    return (
      <Icon
        icon={icon || 'solar:box-bold'}
        className="size-6 text-gray-500"
      />
    )
  }

  return (
    <div className="relative size-6 flex-shrink-0">
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className="object-contain"
        onError={() => {
          if (src && !hasError) {
            // First error: uploaded image failed, try static image
            setHasError(true)
          } else {
            // Second error: static image also failed, show icon
            setStaticImageError(true)
          }
        }}
        unoptimized
      />
    </div>
  )
}

export function StoreSidebar({ categories }: StoreSidebarProps) {
  const { t } = useLanguage()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:left-0 lg:top-14 lg:bottom-0 bg-gray-50/50 border-r border-gray-200/60 overflow-y-auto z-30">
      {/* Categories Section */}
      <div className="p-3">
        <nav className="space-y-0.5">
          <Link
            href="/deals"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            <Icon icon="solar:tag-price-bold" className="size-6 text-primary" />
            <span className="leading-relaxed">{t('deals')}</span>
          </Link>
          {categories.map((category) => {
            const slug = (category.slug || category.id || '').trim()
            if (!slug) return null
            const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            const translationKey = getCategoryTranslationKey(normalizedSlug)
            const label = translationKey ? t(translationKey) : category.name
            return (
              <Link
                key={category.id}
                href={`/categories?slug=${encodeURIComponent(slug)}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-normal text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-colors group"
              >
                <CategoryIconImage
                  src={category.image}
                  slug={category.slug}
                  icon={category.icon}
                  alt={label}
                />
                <span className="leading-relaxed">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200/60 my-1 mx-3" />

      {/* About ZaloraFashion Section */}
      <div className="px-3 py-2">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
          {t('aboutZaloraFashion')}
        </h3>
        <nav className="space-y-0.5">
          <Link
            href="/about"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors"
          >
            <Icon icon="solar:info-circle-linear" className="size-5 text-gray-500" />
            <span className="leading-relaxed">{t('aboutUs')}</span>
          </Link>
          <Link
            href="/auth/register"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors"
          >
            <Icon icon="solar:user-plus-linear" className="size-5 text-gray-500" />
            <span className="leading-relaxed">{t('joinUs')}</span>
          </Link>
          <Link
            href="/contact"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors"
          >
            <Icon icon="solar:letter-linear" className="size-5 text-gray-500" />
            <span className="leading-relaxed">{t('contactUs')}</span>
          </Link>
        </nav>
      </div>

      {/* Exchange and Cooperation Section */}
      <div className="px-3 py-2">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
          {t('exchangeAndCooperation')}
        </h3>
        <nav className="space-y-0.5">
          <Link
            href="/merchant-agreement"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-colors"
          >
            <Icon icon="solar:document-text-linear" className="size-5 text-gray-500" />
            <span className="leading-relaxed">{t('merchantAgreement')}</span>
          </Link>
        </nav>
      </div>
    </aside>
  )
}
