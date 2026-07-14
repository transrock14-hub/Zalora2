'use client'

import Image from 'next/image'
import { Icon } from '@iconify/react'
import { useState } from 'react'

interface CategoryIconProps {
  src: string | null
  alt: string
  icon?: string | null
  slug: string
  size?: number
}

export function CategoryIcon({ src, alt, icon, slug, size = 48 }: CategoryIconProps) {
  const [hasError, setHasError] = useState(false)
  const [staticImageError, setStaticImageError] = useState(false)

  // Priority: uploaded image -> static image in public/images/categories -> icon font
  const imageSrc = src || `/images/categories/${slug}.png`

  // If both uploaded and static images fail, show icon
  if ((hasError && staticImageError) || (!src && staticImageError)) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Icon
          icon={icon || 'solar:box-bold'}
          className="text-gray-500"
          style={{ fontSize: `${size * 0.6}px` }}
        />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className="object-contain p-2.5"
        onError={() => {
          if (src && !hasError) {
            // First error: uploaded image failed, try static image
            setHasError(true)
          } else {
            // Second error: static image also failed, show icon
            setStaticImageError(true)
          }
        }}
        unoptimized // Allow any image source without domain configuration
      />
    </div>
  )
}
