'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { formatPrice } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'
import type { TranslationKey } from '@/lib/translations'

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  balance: number
  role: string
  canSell: boolean
  shop: {
    id: string
    name: string
    status?: string
  } | null
}

interface AccountClientProps {
  user: User
  stats: {
    orders: number
    favorites: number
    sellerOrdersCount?: number
  }
}

export function AccountClient({ user, stats }: AccountClientProps) {
  const { t } = useLanguage()
  const hasNoShop = !user.shop
  const hasApprovedShop = !!(user.shop && user.shop.status === 'ACTIVE')
  const hasShopPending = !!user.shop && user.shop.status !== 'ACTIVE'

  // When no shop: only Apply for shop active; others inactive with message.
  // When shop approved: all active except Apply for shop (and no "Apply for a Job").
  // When shop pending: Verification Status active; others inactive.
  const menuItems: Array<{ icon: string; labelKey: TranslationKey; href: string; color: string; show: boolean; badge?: number; requiresShop?: boolean }> = [
    { icon: 'solar:cart-large-2-bold', labelKey: 'wholesaleManagement', href: '/account/wholesale', color: 'text-chart-1', show: user.canSell, requiresShop: true },
    { icon: 'solar:shop-bold', labelKey: 'applyForShop', href: '/seller/create-shop', color: 'text-chart-2', show: !user.shop, requiresShop: false },
    { icon: 'solar:chart-2-bold', labelKey: 'sellerDashboard', href: '/seller/dashboard', color: 'text-chart-2', show: user.canSell, requiresShop: true },
    { icon: 'solar:shop-bold', labelKey: 'shopDetails', href: '/seller/shop', color: 'text-chart-2', show: user.canSell && !!user.shop, requiresShop: true },
    { icon: 'solar:box-bold', labelKey: 'productManagement', href: '/seller/products', color: 'text-chart-2', show: user.canSell && !!user.shop, requiresShop: true },
    { icon: 'solar:bill-list-bold', labelKey: 'storeOrders', href: '/seller/orders', color: 'text-cyan-500', show: user.canSell && !!user.shop, badge: (stats.sellerOrdersCount ?? 0) || undefined, requiresShop: true },
    { icon: 'solar:verified-check-bold', labelKey: 'verificationStatusCaption', href: '/seller/verification-status', color: 'text-cyan-500', show: !!user.shop || user.canSell, requiresShop: false },
    { icon: 'solar:document-text-bold', labelKey: 'billingRecords', href: '/account/billing', color: 'text-chart-3', show: true, requiresShop: false },
    { icon: 'solar:map-point-bold', labelKey: 'deliveryAddress', href: '/account/addresses', color: 'text-destructive', show: true, requiresShop: true },
    { icon: 'solar:heart-bold', labelKey: 'shopCollection', href: '/account/favorites', color: 'text-chart-2', show: true, requiresShop: true },
    { icon: 'solar:headset-bold', labelKey: 'serviceCenter', href: '/account/support', color: 'text-destructive', show: true, requiresShop: false },
    { icon: 'solar:wallet-bold', labelKey: 'walletManagement', href: '/account/wallet', color: 'text-chart-4', show: true, requiresShop: false },
    { icon: 'solar:lock-password-bold', labelKey: 'loginPassword', href: '/account/password', color: 'text-cyan-500', show: true, requiresShop: false },
    { icon: 'solar:shield-keyhole-bold', labelKey: 'paymentPassword', href: '/account/password', color: 'text-chart-3', show: true, requiresShop: false },
    { icon: 'solar:file-download-bold', labelKey: 'downloadTheApp', href: '#', color: 'text-chart-4', show: true, requiresShop: false },
    { icon: 'solar:settings-bold', labelKey: 'setUp', href: '/account/settings', color: 'text-cyan-500', show: true, requiresShop: false },
  ]

  const visibleMenuItems = menuItems.filter(
    (item) => item.show && !(hasNoShop && item.labelKey === 'applyForShop')
  )
  const isInactive = (item: (typeof menuItems)[0]) => {
    if (item.labelKey === 'applyForShop') return false
    if (hasNoShop) return item.requiresShop === true || item.labelKey === 'verificationStatusCaption'
    if (hasShopPending) return item.requiresShop === true
    if (hasApprovedShop) return false
    return false
  }
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 font-sans text-foreground">
      {/* Header - matches reference (account-management (1)/account-management.tsx): always visible */}
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm">
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          {t('accountManagement')}
        </h1>
        <Link href="/account/settings" className="absolute right-4 text-primary-foreground" aria-label="Settings">
          <Icon icon="solar:globe-linear" className="size-6" />
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Section - matches reference layout exactly */}
        <div className="flex items-center justify-between p-4 bg-card mb-2">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-full overflow-hidden border border-border flex items-center justify-center bg-muted/50">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="size-full object-cover" />
              ) : (
                <Icon icon="solar:user-bold" className="size-8 text-primary" />
              )}
            </div>
            <div>
              <div className="font-bold text-base">{user.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {user.email.replace(/(.{4}).*(@.*)/, '$1****$2')}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">ID: {user.id.slice(-8)}</div>
            </div>
          </div>
          <Link href="/account/profile">
            <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground" />
          </Link>
        </div>

        {/* Stats - matches reference 4-column grid */}
        <div className="grid grid-cols-4 bg-card py-4 mb-2">
          <Link href="/account/favorites" className="flex flex-col items-center gap-1 border-r border-transparent">
            <span className="text-base font-semibold">{stats.favorites}</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">{t('myCollection')}</span>
          </Link>
          <div className="flex flex-col items-center gap-1 border-r border-transparent">
            <span className="text-base font-semibold">0</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">{t('shopCollection')}</span>
          </div>
          <Link href="/account/orders" className="flex flex-col items-center gap-1 border-r border-transparent">
            <span className="text-base font-semibold">{stats.orders}</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">{t('myBrowse')}</span>
          </Link>
          <div className="flex flex-col items-center gap-1">
            <span className="text-base font-bold text-foreground">{formatPrice(user.balance)}</span>
            <span className="text-[10px] text-muted-foreground text-center px-1">{t('accountBalance')}</span>
          </div>
        </div>

        {/* My Orders - matches reference */}
        <div className="bg-card mb-px">
          <div className="px-4 py-3 text-sm font-semibold border-b border-border">My Orders</div>
          <Link href="/account/orders" className="grid grid-cols-5 py-4">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:card-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Payment<br />pending
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:box-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Waiting for<br />delivery
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:delivery-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Waiting for<br />receipt
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:chat-square-check-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">Completed</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Icon icon="solar:restart-linear" className="size-7 text-foreground" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                Refund/<br />After-sales
              </span>
            </div>
          </Link>
        </div>

        {/* Top-up / Withdrawal - matches reference (lowercase "top up") */}
        <div className="bg-card mb-2">
          <div className="flex py-3 divide-x divide-border">
            <Link href="/account/wallet/topup" className="flex-1 flex items-center justify-center gap-2 py-1">
              <Icon icon="solar:download-linear" className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('topUp')}</span>
            </Link>
            <Link href="/account/wallet/withdraw" className="flex-1 flex items-center justify-center gap-2 py-1">
              <Icon icon="solar:upload-linear" className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('withdrawal')}</span>
            </Link>
          </div>
          <div className="flex gap-4 px-4 pb-3 text-sm">
            <Link href="/account/wallet/recharge-record" className="text-primary hover:underline">
              {t('rechargeRecord')}
            </Link>
            <Link href="/account/wallet/withdrawal-record" className="text-primary hover:underline">
              {t('withdrawalRecord')}
            </Link>
          </div>
        </div>

        {/* Menu Items - Apply for shop first (above Billing records), then rest */}
        <div className="bg-card flex flex-col">
          {/* Open a shop — KYC-linked, above Billing records; any user without a shop can apply */}
          {!user.shop && (
            <>
              <div className="px-4 py-3 bg-muted/40 border-b border-border/50">
                <h2 className="text-sm font-semibold text-foreground">{t('openAShop')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('identityVerificationKycMessage')}
                </p>
              </div>
              <a href="/seller/create-shop" className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
                <Icon icon="solar:shop-bold" className="size-6 text-chart-1 mr-3" />
                <span className="flex-1 text-sm font-medium">{t('applyForShop')}</span>
                <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">KYC required</span>
                <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
              </a>
            </>
          )}
          {visibleMenuItems.map((item, index) =>
            isInactive(item) ? (
              <div
                key={item.href + index}
                className={`flex items-center px-4 py-3.5 opacity-60 cursor-not-allowed ${
                  index < visibleMenuItems.length - 1 ? 'border-b border-border/50' : ''
                }`}
                aria-disabled
              >
                <Icon icon={item.icon} className={`size-6 ${item.color} mr-3`} />
                <span className="flex-1">
                  <span className="text-sm font-medium block">{t(item.labelKey)}</span>
                  <span className="text-xs text-muted-foreground">{t('approveShopToAccess')}</span>
                </span>
                <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground/50" />
              </div>
            ) : (
              <Link
                key={item.href + index}
                href={item.href}
                className={`flex items-center px-4 py-3.5 active:bg-muted/30 ${
                  index < visibleMenuItems.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <Icon icon={item.icon} className={`size-6 ${item.color} mr-3`} />
                <span className="flex-1 text-sm font-medium">{t(item.labelKey)}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="mr-2 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
              </Link>
            )
          )}

          {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <Link href="/admin" className="flex items-center px-4 py-3.5 border-b border-border/50 active:bg-muted/30">
              <Icon icon="solar:shield-keyhole-bold" className="size-6 text-chart-3 mr-3" />
              <span className="flex-1 text-sm font-medium">Admin Panel</span>
              <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
            </Link>
          )}

          <Link href="/auth/logout" className="flex items-center px-4 py-3.5 active:bg-muted/30">
            <Icon icon="solar:logout-bold" className="size-6 text-chart-5 mr-3" />
            <span className="flex-1 text-sm font-medium">{t('logOut')}</span>
            <Icon icon="solar:alt-arrow-right-linear" className="size-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  )
}
