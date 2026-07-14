'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUserStore } from '@/lib/store'

/**
 * Used when the server didn't get the auth cookie (e.g. Netlify). We run a
 * client-side session check. If /api/auth/me returns the user, we do a FULL
 * page load to the current path so the next request sends cookies (Next.js
 * router.refresh() RSC fetch often does not send cookies on Netlify). If not,
 * redirect to login.
 */
export function SessionCheckAndRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const setUser = useUserStore((state) => state.setUser)
  const [message, setMessage] = useState('Checking session...')

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()

        if (cancelled) return

        if (res.ok && data.user) {
          setUser(data.user)
          setMessage('Loading...')
          // Full page load so the browser sends cookies; router.refresh() RSC
          // fetch often does not include cookies on Netlify, so we'd stay stuck.
          const target = pathname && pathname.startsWith('/') ? pathname : '/account'
          window.location.href = target
          return
        }

        const redirectPath = pathname?.startsWith('/') ? pathname : '/account'
        router.replace('/auth/login?redirect=' + encodeURIComponent(redirectPath))
      } catch {
        if (!cancelled) {
          router.replace('/auth/login?redirect=' + encodeURIComponent(pathname || '/account'))
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [pathname, router, setUser])

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
