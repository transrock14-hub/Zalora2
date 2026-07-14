'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { useCartStore, useUserStore, useUIStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { LanguageSelector } from '@/components/language-selector'
import { useLanguage } from '@/contexts/language-context'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { useStorePageTitleValue } from '@/contexts/store-page-title-context'

export function Header() {
  const { t } = useLanguage()
  const user = useUserStore((state) => state.user)
  const itemCount = useCartStore((state) => state.getItemCount())
  const setSearchOpen = useUIStore((state) => state.setSearchOpen)
  const pageTitle = useStorePageTitleValue()

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200/60 hidden lg:block">
      <div className="container mx-auto px-6">
        <div className="flex h-14 items-center justify-between gap-6">
          {/* Logo + optional shop name - Left */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/images/logo.png"
                alt="ZALORA Fashion"
                width={130}
                height={36}
                className="object-contain"
                priority
              />
            </Link>
            {pageTitle ? (
              <>
                <span className="text-gray-300 font-light" aria-hidden>
                  |
                </span>
                <span className="text-gray-700 font-medium text-sm truncate max-w-[180px] xl:max-w-[240px]" title={pageTitle}>
                  {pageTitle}
                </span>
              </>
            ) : null}
          </div>

          {/* Search Bar - Center */}
          <div className="flex-1 flex items-center gap-2 max-w-2xl mx-6">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                onClick={() => setSearchOpen(true)}
                className="w-full px-4 py-2 pr-11 bg-gray-50/80 border border-gray-200 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white transition-colors"
                readOnly
              />
              <Icon 
                icon="solar:magnifer-linear" 
                className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" 
              />
            </div>
            <Button
              onClick={() => setSearchOpen(true)}
              variant="outline"
              size="sm"
              className="whitespace-nowrap px-4 py-2 h-9 text-sm font-normal bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 rounded-md transition-colors"
            >
              Search Products
            </Button>
            <Button
              onClick={() => setSearchOpen(true)}
              variant="outline"
              size="sm"
              className="whitespace-nowrap px-4 py-2 h-9 text-sm font-normal bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 rounded-md transition-colors"
            >
              Search Store
            </Button>
          </div>

          {/* Actions - Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Home */}
            <Link href="/" className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors">
              <Icon icon="solar:home-2-linear" className="size-5" />
              <span className="text-sm font-normal">{t('home')}</span>
            </Link>

            {/* Categories */}
            <Link href="/categories" className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors">
              <Icon icon="solar:widget-2-linear" className="size-5" />
              <span className="text-sm font-normal">{t('categories')}</span>
            </Link>

            {/* Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors px-2 py-1 rounded-md hover:bg-gray-50">
                    {user.avatar ? (
                      <Avatar className="size-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Icon icon="solar:user-circle-linear" className="size-5" />
                    )}
                    <span className="text-sm font-normal">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <Icon icon="solar:user-circle-linear" className="mr-2 size-4" />
                      Account management
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/settings">
                      <Icon icon="solar:settings-linear" className="mr-2 size-4" />
                      Account settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">
                      <Icon icon="solar:box-linear" className="mr-2 size-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <>
                    <DropdownMenuSeparator />
                    {user.shop && user.shop.status === 'ACTIVE' ? (
                      <DropdownMenuItem asChild>
                        <Link href="/seller/dashboard">
                          <Icon icon="solar:shop-linear" className="mr-2 size-4" />
                          {t('sellerDashboard')}
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled className="opacity-60 cursor-not-allowed">
                        <Icon icon="solar:shop-linear" className="mr-2 size-4" />
                        <span className="flex flex-col items-start">
                          <span>{t('sellerDashboard')}</span>
                          <span className="text-xs font-normal text-muted-foreground">{t('approveShopToAccess')}</span>
                        </span>
                      </DropdownMenuItem>
                    )}
                  </>
                  {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Icon icon="solar:settings-linear" className="mr-2 size-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/auth/logout">
                      <Icon icon="solar:logout-2-linear" className="mr-2 size-4" />
                      {t('logout')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login" className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors">
                <Icon icon="solar:user-circle-linear" className="size-5" />
                <span className="text-sm font-normal">{t('account')}</span>
              </Link>
            )}

            {/* Notifications */}
            {user && <NotificationsDropdown variant="user" />}

            {/* Cart */}
            <Link href="/cart" className="relative flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors">
              <Icon icon="solar:cart-large-linear" className="size-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full size-4 flex items-center justify-center min-w-[16px]">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Language Selector */}
            <LanguageSelector />

          </div>
        </div>
      </div>
    </header>
  )
}
