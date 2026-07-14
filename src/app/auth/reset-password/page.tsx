'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  useEffect(() => {
    let active = true
    const supabase = createSupabaseBrowserClient()

    async function init() {
      try {
        // PKCE flow: the recovery link may include ?code=...
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
        const { data } = await supabase.auth.getSession()
        if (active) setValidSession(!!data.session)
      } catch {
        if (active) setValidSession(false)
      } finally {
        if (active) setReady(true)
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setValidSession(true)
        setReady(true)
      }
    })

    init()
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      setDone(true)
      toast.success('Password updated! You can now log in.')
      setTimeout(() => router.push('/auth/login'), 1800)
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <header className="flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/auth/login" className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Reset Password
        </h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Image
                src="/images/logo.png"
                alt="ZALORA"
                width={180}
                height={60}
                className="rounded-xl object-contain mx-auto"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-heading">Set a New Password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="flex justify-center py-6">
                <Icon icon="solar:refresh-circle-linear" className="size-8 animate-spin text-primary" />
              </div>
            ) : done ? (
              <div className="text-center space-y-4">
                <div className="size-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <Icon icon="solar:check-circle-bold" className="size-10" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your password has been updated. Redirecting to login...
                </p>
              </div>
            ) : !validSession ? (
              <div className="text-center space-y-4">
                <div className="size-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <Icon icon="solar:close-circle-bold" className="size-10" />
                </div>
                <p className="text-sm text-muted-foreground">
                  This reset link is invalid or has expired. Please request a new one.
                </p>
                <Button asChild className="w-full">
                  <Link href="/auth/forgot-password">Request new link</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}
            <div className="mt-4 text-center text-sm">
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
