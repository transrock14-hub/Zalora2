'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AddressRow {
  id: string
  currency: string
  address: string
  network: string | null
  label: string | null
  qrCode: string | null
}

interface DepositFormClientProps {
  balance: number
  currency: string
  addresses: AddressRow[]
  shopId?: string | null
  backHref?: string
  recordHref?: string
}

export function DepositFormClient({ balance, currency, addresses, shopId, backHref = '/account/wallet/topup', recordHref = '/account/wallet/recharge-record' }: DepositFormClientProps) {
  const [networkId, setNetworkId] = useState(addresses[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [amountReceived, setAmountReceived] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generatedQr, setGeneratedQr] = useState<string | null>(null)

  const selected = addresses.find((a) => a.id === networkId) ?? addresses[0]

  // Auto-generate QR from address when qrCode is not stored (for already added addresses)
  useEffect(() => {
    if (!selected?.address) {
      setGeneratedQr(null)
      return
    }
    if (selected.qrCode) {
      setGeneratedQr(null)
      return
    }
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(selected!.address, { width: 192, margin: 1 })
        .then(setGeneratedQr)
        .catch(() => setGeneratedQr(null))
    })
  }, [selected?.id, selected?.address, selected?.qrCode])

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'deposits')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setProofUrl(data.url)
      toast.success('Uploaded')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wallet/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          network: selected?.network || null,
          amount: numAmount,
          proofUrl: proofUrl || null,
          ...(shopId != null && shopId !== '' ? { shopId } : {}),
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      toast.success('Deposit submitted. Pending admin approval.')
      window.location.href = recordHref
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const copyAddress = () => {
    if (selected?.address) {
      navigator.clipboard.writeText(selected.address)
      toast.success('Address copied')
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
          top up
        </h1>
        <Link href={recordHref} className="text-sm text-primary-foreground">
          <span>Recharge Record</span>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-md space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Current account balance</p>
            <p className="text-2xl font-bold">{formatPrice(balance)}</p>
          </div>

          <div>
            <Label className="mb-2 block">Please select the recharge network</Label>
            <select
              value={networkId}
              onChange={(e) => setNetworkId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.network || a.currency}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <>
              {(selected.qrCode || generatedQr) && (
                <div className="flex flex-col items-center">
                  <div className="relative w-48 h-48 bg-white rounded-lg border border-border overflow-hidden">
                    <Image
                      src={selected.qrCode || generatedQr || ''}
                      alt="QR"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Scan the QR code to recharge</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground break-all font-mono">{selected.address}</p>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="text-primary text-sm font-medium underline mt-1"
                >
                  Copy deposit address
                </button>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Recharge amount</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                min="0"
                placeholder="Please enter the recharge amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setAmountReceived(e.target.value)
                }}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Amount received ({currency})</Label>
              <Input
                type="text"
                readOnly
                value={amountReceived || amount || '0'}
                className="mt-2 bg-muted"
              />
            </div>
            <div>
              <Label>Upload recharge voucher</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-muted/30">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  disabled={uploading}
                  className="hidden"
                  id="proof-upload"
                />
                <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Icon icon="solar:add-circle-bold" className="size-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Upload Credentials'}
                  </span>
                </label>
                {proofUrl && (
                  <div className="relative w-20 h-20 rounded border border-border overflow-hidden mt-2">
                    <Image src={proofUrl} alt="Proof" fill className="object-cover" unoptimized />
                  </div>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm recharge'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
