'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'

export default function PaymentPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasPaymentPassword, setHasPaymentPassword] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/account/payment-password', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          setHasPaymentPassword(Boolean(data.hasPaymentPassword))
        }
      } catch {
        // ignore — form still usable
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (hasPaymentPassword && !formData.currentPassword) {
      toast.error('Enter your current payment password')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/account/payment-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update payment password')
      }
      toast.success(data.message || 'Payment password saved')
      setHasPaymentPassword(true)
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Payment Password
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <div className="hidden lg:block mb-6">
            <h1 className="text-2xl font-bold font-heading">Payment Password</h1>
            <p className="text-muted-foreground mt-2">
              Used to confirm withdrawals. Separate from your login password.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {checking
                  ? 'Loading…'
                  : hasPaymentPassword
                    ? 'Change payment password'
                    : 'Set payment password'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {hasPaymentPassword && (
                  <div>
                    <Label htmlFor="current">Current Payment Password</Label>
                    <Input
                      id="current"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={formData.currentPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, currentPassword: e.target.value })
                      }
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="new">New Payment Password</Label>
                  <Input
                    id="new"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || checking}>
                  {loading ? 'Saving...' : hasPaymentPassword ? 'Update Password' : 'Set Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
