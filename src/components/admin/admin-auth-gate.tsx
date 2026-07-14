'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useUserStore } from '@/lib/store'
import { AuthSync } from '@/components/auth-sync'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminHeader } from '@/components/admin/header'
import { Button } from '@/components/ui/button'

const AUTH_CHECK_TIMEOUT_MS = 12_000

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const setUserStore = useUserStore((state) => state.setUser)
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string; avatar?: string | null; isImpersonating?: boolean } | null>(null)
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied' | 'timeout' | 'error'>('checking')

  const isLoginPage = pathname === '/admin/login'

  const check = useCallback(async () => {
    if (isLoginPage) {
      setStatus('allowed')
      return
    }

    setStatus('checking')
    setUser(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS)

    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json().catch(() => ({ user: null }))

      if (res.ok && data.user) {
        const u = data.user
        if (u.role !== 'ADMIN' && u.role !== 'MANAGER') {
          setStatus('denied')
          router.replace('/')
          return
        }
        setUserStore(u)
        setUser(u)
        setStatus('allowed')
        return
      }

      setStatus('denied')
      router.replace('/admin/login')
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (isAbort) {
        setStatus('timeout')
      } else {
        setStatus('error')
      }
    }
  }, [router, setUserStore, isLoginPage])

  useEffect(() => {
    if (isLoginPage) {
      setStatus('allowed')
      return
    }
    check()
  }, [isLoginPage, check])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (status === 'denied') {
    return null
  }

  if (status === 'timeout' || status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-muted-foreground text-center">
          {status === 'timeout'
            ? 'Session check took too long. The server may be starting up.'
            : 'Could not verify your session.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => check()}>
            Retry
          </Button>
          <Button asChild>
            <Link href="/admin/login">Log in</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status !== 'allowed' || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Checking session...</p>
        <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/3 animate-pulse bg-primary rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthSync />
      <AdminSidebar user={user} />
      <div className="lg:pl-64">
        <AdminHeader user={user} />
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
