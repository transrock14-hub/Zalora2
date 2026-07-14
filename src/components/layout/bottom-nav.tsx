'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/store'
import { useLanguage } from '@/contexts/language-context'
import { TranslationKey } from '@/lib/translations'

const navItems = [
  {
    labelKey: 'home' as TranslationKey,
    href: '/',
    icon: 'solar:home-2-linear',
    activeIcon: 'solar:home-2-bold',
  },
  {
    labelKey: 'categories' as TranslationKey,
    href: '/categories',
    icon: 'solar:widget-2-linear',
    activeIcon: 'solar:widget-2-bold',
  },
  {
    labelKey: 'deals' as TranslationKey,
    href: '/deals',
    icon: 'solar:tag-price-linear',
    activeIcon: 'solar:tag-price-bold',
  },
  {
    labelKey: 'cart' as TranslationKey,
    href: '/cart',
    icon: 'solar:cart-large-linear',
    activeIcon: 'solar:cart-large-bold',
  },
  {
    labelKey: 'account' as TranslationKey,
    href: '/account',
    icon: 'solar:user-circle-linear',
    activeIcon: 'solar:user-circle-bold',
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const itemCount = useCartStore((state) => state.getItemCount())
  const { t } = useLanguage()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center py-2 pb-safe-area z-50 lg:hidden">
      {navItems.map((item) => {
        const isActive = 
          item.href === '/' 
            ? pathname === '/'
            : pathname.startsWith(item.href)
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 p-2 relative',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div className="relative">
              <Icon
                icon={isActive ? item.activeIcon : item.icon}
                className="size-6"
              />
              {item.labelKey === 'cart' && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
