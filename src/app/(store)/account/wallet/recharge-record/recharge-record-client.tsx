'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'

interface Deposit {
  id: string
  currency: string
  network: string | null
  amount: number
  status: string
  createdAt: string
  reviewedAt: string | null
}

interface RechargeRecordClientProps {
  shopId?: string | null
  backHref?: string
  topupHref?: string
}

export function RechargeRecordClient({ shopId, backHref = '/account/wallet/topup', topupHref = '/account/wallet/topup' }: RechargeRecordClientProps = {}) {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeposits = useCallback(async () => {
    try {
      const url = shopId
        ? `/api/wallet/deposits?scope=shop&shopId=${encodeURIComponent(shopId)}`
        : '/api/wallet/deposits'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setDeposits(data.deposits || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [shopId])

  useEffect(() => {
    fetchDeposits()
  }, [fetchDeposits])

  // Auto-refresh when there are PENDING items (live updates)
  const hasPending = deposits.some((d) => d.status === 'PENDING')
  useEffect(() => {
    if (!hasPending) return
    const interval = setInterval(fetchDeposits, 8000)
    return () => clearInterval(interval)
  }, [hasPending, fetchDeposits])

  const statusColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800'
    if (status === 'REJECTED') return 'bg-red-100 text-red-800'
    return 'bg-amber-100 text-amber-800'
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm">
        <Link href={backHref} className="flex items-center gap-1.5 text-primary-foreground text-sm font-medium">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
          Back
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Recharge Record
        </h1>
        <span className="w-20" />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-md">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : deposits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon icon="solar:history-bold" className="size-16 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium mb-2">No recharge records</h3>
                <p className="text-muted-foreground text-center text-sm mb-4">
                  Your deposit history will appear here
                </p>
                <Link href={topupHref} className="text-primary font-medium text-sm inline-block">
                  <span>Go to Recharge Methods</span>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {deposits.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-medium">{d.currency} {d.network ? `(${d.network})` : ''}</p>
                        <p className="text-sm text-muted-foreground mt-0.5" suppressHydrationWarning>
                          {Number(d.amount).toFixed(2)} · {formatDateTime(d.createdAt)}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${statusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
