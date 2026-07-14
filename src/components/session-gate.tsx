'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

/**
 * When the server didn't get the auth cookie (e.g. Netlify cold start), we still
 * give the client a chance to send it. This gate fetches /api/auth/me; if the
 * session is valid, we render children. If not, we redirect to login.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const setUser = useUserStore((state) => state.setUser)
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking')

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()

        if (cancelled) return

        if (res.ok && data.user) {
          setUser(data.user)
          setStatus('allowed')
          return
        }

        setStatus('denied')
        const redirectPath = pathname && pathname.startsWith('/') ? pathname : '/account'
        router.replace('/auth/login?redirect=' + encodeURIComponent(redirectPath))
      } catch {
        if (!cancelled) {
          setStatus('denied')
          router.replace('/auth/login?redirect=' + encodeURIComponent(pathname || '/account'))
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [pathname, router, setUser])

  if (status === 'allowed') {
    return <>{children}</>
  }

  if (status === 'denied') {
    return null
  }

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Checking session...</p>
    </div>
  )
}
