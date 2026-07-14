'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatDate } from '@/lib/utils'

interface BillingRecord {
  id: string
  type: 'ORDER' | 'DEPOSIT' | 'WITHDRAWAL' | 'WHOLESALE_CHARGE' | 'SALES_PAYOUT' | 'WHOLESALE_REFUND'
  reference: string
  description: string
  amount: number
  currency: string
  status: string
  method: string | null
  createdAt: string
  linkOrderId?: string
}

const typeMeta: Record<
  BillingRecord['type'],
  { icon: string; label: string; sign: '+' | '-'; amountClass: string }
> = {
  ORDER: {
    icon: 'solar:bag-4-bold',
    label: 'Order',
    sign: '-',
    amountClass: 'text-foreground',
  },
  DEPOSIT: {
    icon: 'solar:card-recive-bold',
    label: 'Top-up',
    sign: '+',
    amountClass: 'text-green-600',
  },
  WITHDRAWAL: {
    icon: 'solar:card-send-bold',
    label: 'Withdrawal',
    sign: '-',
    amountClass: 'text-foreground',
  },
  WHOLESALE_CHARGE: {
    icon: 'solar:shop-bold',
    label: 'Store order cost',
    sign: '-',
    amountClass: 'text-red-600',
  },
  SALES_PAYOUT: {
    icon: 'solar:wallet-money-bold',
    label: 'Sales payout',
    sign: '+',
    amountClass: 'text-green-600',
  },
  WHOLESALE_REFUND: {
    icon: 'solar:restart-bold',
    label: 'Order refund',
    sign: '+',
    amountClass: 'text-green-600',
  },
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'USD') return formatPrice(amount, 'USD')
  return `${amount} ${currency}`
}

function statusColor(status: string): string {
  const s = status.toUpperCase()
  if (['COMPLETED', 'APPROVED', 'PAID', 'DELIVERED', 'DEDUCTED', 'CREDITED', 'REFUNDED'].includes(s)) {
    return 'bg-green-500'
  }
  if (['PENDING', 'CONFIRMING', 'PROCESSING', 'PENDING_PAYMENT'].includes(s)) return 'bg-yellow-500'
  if (['FAILED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(s)) return 'bg-red-500'
  return 'bg-gray-500'
}

export default function BillingPage() {
  const [records, setRecords] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/account/billing')
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data.records)) setRecords(data.records)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Billing Records
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold font-heading">Billing Records</h1>
            <p className="text-muted-foreground mt-2">
              Top-ups, withdrawals, and store order wholesale charges
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon icon="solar:bill-list-linear" className="size-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No billing records</h3>
                <p className="text-muted-foreground">Your payment history will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const meta = typeMeta[r.type]
                const orderHref =
                  r.type === 'ORDER'
                    ? `/account/orders/${r.id}`
                    : r.linkOrderId
                      ? `/seller/orders/${r.linkOrderId}`
                      : null

                const content = (
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="size-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon icon={meta.icon} className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {meta.label} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${meta.amountClass}`}>
                          {meta.sign}
                          {formatAmount(r.amount, r.currency)}
                        </p>
                        <Badge className={`${statusColor(r.status)} mt-1 text-[10px]`}>
                          {r.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )

                return orderHref ? (
                  <Link key={r.id} href={orderHref}>
                    {content}
                  </Link>
                ) : (
                  <div key={r.id}>{content}</div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
