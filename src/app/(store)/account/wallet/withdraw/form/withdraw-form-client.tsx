'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface WithdrawFormClientProps {
  balance: number
  currency: string
  network: string
  methodId: string
  shopId?: string | null
  backHref?: string
  recordHref?: string
}

export function WithdrawFormClient({ balance, currency, network, shopId, backHref = '/account/wallet/withdraw', recordHref = '/account/wallet/withdrawal-record' }: WithdrawFormClientProps) {
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!address.trim()) {
      toast.error('Please enter withdrawal address')
      return
    }
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (numAmount > balance) {
      toast.error('Insufficient balance')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wallet/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: currency === 'BANK' ? 'BANK' : currency,
          network: currency === 'BANK' ? null : network,
          address: address.trim(),
          amount: numAmount,
          ...(shopId != null && shopId !== '' ? { shopId } : {}),
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      toast.success('Withdrawal submitted. Pending admin approval.')
      window.location.href = recordHref
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm">
        <Link href={backHref} className="flex items-center gap-1.5 text-primary-foreground text-sm font-medium">
          <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
          <span>Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Withdrawal
        </h1>
        <Link href={recordHref} className="text-sm text-primary-foreground">
          <span>Withdrawal Record</span>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-md space-y-6">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Currency</span>
                <span className="font-medium">{currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Chain Name</span>
                <span className="font-medium">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                    {network}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="address">* Withdrawal address</Label>
              <Input
                id="address"
                type="text"
                placeholder="Please enter the withdrawal address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">* Withdrawal amount</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                min="0"
                placeholder="Please enter the withdrawal amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2"
                required
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Available balance: {formatPrice(balance)}
            </p>
            <p className="text-xs text-muted-foreground">
              The credited amount will be settled according to the relevant fees charged by your receiving account or the real-time exchange rate.
            </p>
            <p className="text-xs text-muted-foreground">
              Your withdrawal will be credited within 24 hours, please wait patiently! If it is not credited within 24 hours, please contact online customer service!!!
            </p>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Withdrawal'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
