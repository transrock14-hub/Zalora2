'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'

const withdrawalMethods = [
  { id: 'usdt-erc20', label: 'USDT-ERC20', icon: 'simple-icons:tether', color: 'bg-emerald-500' },
  { id: 'usdt-trc20', label: 'USDT-TRC20', icon: 'simple-icons:tether', color: 'bg-emerald-500' },
  { id: 'eth', label: 'ETH', icon: 'cryptocurrency:eth', color: 'bg-violet-500' },
  { id: 'btc', label: 'BTC', icon: 'cryptocurrency:btc', color: 'bg-amber-500' },
  { id: 'bank', label: 'Online Banking Withdrawal', icon: 'solar:card-bold', color: 'bg-blue-500' },
]

export default function SellerShopWithdrawPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm">
        <Link href="/seller/shop" className="flex items-center gap-1.5 text-primary-foreground text-sm font-medium">
          <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
          <span>Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Shop Withdrawal
        </h1>
        <Link href="/seller/shop/wallet/withdrawal-record" className="text-sm text-primary-foreground">
          <span>Withdrawal Record</span>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {withdrawalMethods.map((method) => (
                <Link
                  key={method.id}
                  href={`/seller/shop/wallet/withdraw/form?method=${encodeURIComponent(method.id)}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
                >
                  <span className={`size-10 rounded-full ${method.color} flex items-center justify-center inline-flex flex-shrink-0`}>
                    <Icon icon={method.icon} className="size-5 text-white" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm font-medium">{method.label}</span>
                  <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
