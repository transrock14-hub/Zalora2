'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'

interface WalletClientProps {
  balance: number
}

interface Deposit {
  id: string
  currency: string
  network: string | null
  amount: number
  status: string
  createdAt: string
}

interface Withdrawal {
  id: string
  currency: string
  network: string | null
  amount: number
  status: string
  createdAt: string
}

type Transaction = {
  id: string
  type: 'deposit' | 'withdrawal'
  currency: string
  network: string | null
  amount: number
  status: string
  createdAt: string
}

export function WalletClient({ balance }: WalletClientProps) {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const [depRes, wdRes] = await Promise.all([
          fetch('/api/wallet/deposits', { credentials: 'include' }),
          fetch('/api/wallet/withdrawals', { credentials: 'include' }),
        ])
        const depData = depRes.ok ? await depRes.json() : { deposits: [] }
        const wdData = wdRes.ok ? await wdRes.json() : { withdrawals: [] }
        const deposits: Transaction[] = (depData.deposits || []).map((d: Deposit) => ({
          id: d.id,
          type: 'deposit',
          currency: d.currency,
          network: d.network,
          amount: Number(d.amount),
          status: d.status,
          createdAt: d.createdAt,
        }))
        const withdrawals: Transaction[] = (wdData.withdrawals || []).map((w: Withdrawal) => ({
          id: w.id,
          type: 'withdrawal',
          currency: w.currency,
          network: w.network,
          amount: Number(w.amount),
          status: w.status,
          createdAt: w.createdAt,
        }))
        const merged = [...deposits, ...withdrawals].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setTransactions(merged.slice(0, 20))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [])

  const statusColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800'
    if (status === 'REJECTED') return 'bg-red-100 text-red-800'
    return 'bg-amber-100 text-amber-800'
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white flex items-center">
          <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
          <span className="sr-only">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          {t('myWallet')}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold font-heading">{t('walletManagement')}</h1>
            <p className="text-muted-foreground mt-2">{t('manageYourAccountBalance')}</p>
          </div>

          {/* Balance Card */}
          <Card className="mb-6 bg-gradient-to-br from-primary to-primary/80 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm opacity-90">{t('availableBalance')}</span>
                <Icon icon="solar:wallet-bold" className="size-6" />
              </div>
              <div className="text-4xl font-bold mb-6">{formatPrice(balance)}</div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 w-full" asChild>
                  <Link href="/account/wallet/topup" className="flex items-center justify-center gap-2">
                    <Icon icon="solar:add-circle-bold" className="size-4" aria-hidden />
                    <span>{t('topUp')}</span>
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1 w-full bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                  <Link href="/account/wallet/withdraw" className="flex items-center justify-center gap-2">
                    <Icon icon="solar:download-bold" className="size-4" aria-hidden />
                    <span>{t('withdraw')}</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{t('transactionHistory')}</CardTitle>
              <div className="flex gap-2">
                <Link href="/account/wallet/recharge-record" className="text-sm text-primary hover:underline">
                  <span>{t('rechargeRecord')}</span>
                </Link>
                <span className="text-muted-foreground">|</span>
                <Link href="/account/wallet/withdrawal-record" className="text-sm text-primary hover:underline">
                  <span>{t('withdrawalRecord')}</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon icon="solar:refresh-circle-bold" className="size-10 mb-2 animate-spin opacity-50" />
                  <p className="text-sm">{t('loading')}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon icon="solar:receipt-linear" className="size-16 mb-4 opacity-30" />
                  <p>{t('noTransactionsYet')}</p>
                  <p className="text-xs mt-1">{t('depositsWithdrawalsAppearHere')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={`${tx.type}-${tx.id}`}
                      className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`shrink-0 size-9 rounded-full flex items-center justify-center ${
                            tx.type === 'deposit' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          <Icon
                            icon={tx.type === 'deposit' ? 'solar:download-minimalistic-bold' : 'solar:upload-minimalistic-bold'}
                            className="size-4"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {tx.type === 'deposit' ? t('topUp') : t('withdrawal')} · {tx.currency}
                            {tx.network ? ` (${tx.network})` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-semibold text-sm ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-violet-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatPrice(tx.amount)}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
