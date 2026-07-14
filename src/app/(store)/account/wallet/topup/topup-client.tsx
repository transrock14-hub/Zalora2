'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TopUpClientProps {
  balance: number
}

export function TopUpClient({ balance }: TopUpClientProps) {
  const [amount, setAmount] = useState('')

  const quickAmounts = [10, 25, 50, 100]

  const handleTopUp = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    toast.success('Top-up functionality coming soon!')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account/wallet" className="text-white flex items-center">
          <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
          <span className="sr-only">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          top up
        </h1>
        <Link href="/account/billing" className="text-sm text-primary-foreground">
          <span>Recharge Record</span>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <p className="text-sm text-muted-foreground mb-1">Current account balance</p>
          <p className="text-2xl font-bold mb-6">{formatPrice(balance)}</p>
          <Card>
            <CardHeader>
              <CardTitle>Add Funds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl h-14"
                />
              </div>

              <div>
                <Label className="mb-2 block">Quick Select</Label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      onClick={() => setAmount(amt.toString())}
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>
              </div>

              <Button onClick={handleTopUp} className="w-full" size="lg">
                Continue to Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
