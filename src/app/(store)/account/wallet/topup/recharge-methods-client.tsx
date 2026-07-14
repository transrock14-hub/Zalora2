'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'

interface CryptoAddress {
  id: string
  currency: string
  address: string
  network: string | null
  label: string | null
  qrCode: string | null
}

// Same coin icons as withdrawal page
// Match by prefix so USDT_ERC20, USDT_TRC20 etc. all get tether icon
function getCurrencyIcon(currency: string): string {
  const c = (currency || '').toUpperCase()
  if (c.includes('USDT')) return 'simple-icons:tether'
  if (c.includes('BTC')) return 'cryptocurrency:btc'
  if (c.includes('ETH')) return 'cryptocurrency:eth'
  return 'solar:wallet-money-bold'
}
const currencyIcons: Record<string, string> = {
  USDT: 'simple-icons:tether',
  BTC: 'cryptocurrency:btc',
  ETH: 'cryptocurrency:eth',
}

const currencyColors: Record<string, string> = {
  USDT: 'bg-emerald-500',
  BTC: 'bg-amber-500',
  ETH: 'bg-violet-500',
}
function getCurrencyColor(currency: string): string {
  const c = (currency || '').toUpperCase()
  if (c.includes('USDT')) return 'bg-emerald-500'
  if (c.includes('BTC')) return 'bg-amber-500'
  if (c.includes('ETH')) return 'bg-violet-500'
  return 'bg-muted'
}

interface RechargeMethodsClientProps {
  addresses: CryptoAddress[]
  /** When set (e.g. for shop wallet), links go here instead of /account/wallet/topup/deposit */
  depositBasePath?: string
  backHref?: string
  recordHref?: string
}

export function RechargeMethodsClient({ addresses, depositBasePath = '/account/wallet/topup/deposit', backHref = '/account/wallet', recordHref = '/account/wallet/recharge-record' }: RechargeMethodsClientProps) {
  const byCurrency = addresses.reduce<Record<string, CryptoAddress[]>>((acc, a) => {
    const c = (a.currency || '').toUpperCase()
    if (!acc[c]) acc[c] = []
    acc[c].push(a)
    return acc
  }, {})
  const methods = Object.keys(byCurrency).sort()

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm">
        <Link href={backHref} className="flex items-center gap-1.5 text-primary-foreground text-sm font-medium">
          <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
          <span>Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Recharge Methods
        </h1>
        <Link href={recordHref} className="text-sm text-primary-foreground">
          Recharge Record
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-md">
          {methods.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon icon="solar:wallet-money-bold" className="size-16 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium mb-2">No recharge methods</h3>
                <p className="text-muted-foreground text-center text-sm">
                  Recharge options will appear here once configured. Contact support.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {methods.map((currency) => (
                  <Link
                    key={currency}
                    href={`${depositBasePath}?currency=${encodeURIComponent(currency)}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={`size-10 rounded-full flex items-center justify-center text-white shrink-0 inline-flex ${getCurrencyColor(currency)}`}
                    >
                      <Icon icon={getCurrencyIcon(currency)} className="size-5" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-medium">{currency}</span>
                    <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground" aria-hidden />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
