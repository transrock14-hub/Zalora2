'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/** Full-screen notice shown while a merchant store is order-SLA blocked. */
export function MerchantStoreBlocked({
  showHeader = true,
  backHref = '/account',
}: {
  showHeader?: boolean
  backHref?: string
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {showHeader && (
        <header className="sticky top-0 z-10 flex items-center h-14 bg-primary px-4 shadow-sm">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-primary-foreground text-sm font-medium"
          >
            <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
            <span>Back</span>
          </Link>
          <h1 className="flex-1 text-center text-lg font-semibold text-primary-foreground font-heading pr-14">
            Merchant Store Blocked!
          </h1>
        </header>
      )}

      <div className="flex-1 container mx-auto px-4 py-10 max-w-lg flex items-center justify-center">
        <Card className="w-full border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Icon icon="solar:lock-keyhole-bold" className="size-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold font-heading text-destructive">
              Merchant Store Blocked!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              An order was not processed within 24 hours. This message stays visible until the
              outstanding order has been processed. Only Top Up and Store Orders remain available.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/seller/orders?status=pending&blocked=1">
                <Button className="w-full sm:w-auto">Store Orders</Button>
              </Link>
              <Link href="/account/wallet/topup">
                <Button variant="outline" className="w-full sm:w-auto">
                  Top Up
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
