'use client'

import { useEffect } from 'react'

/**
 * Logout page: runs logout only when the user actually visits (client-side).
 * Do NOT use a GET route handler here — Next.js prefetches <Link href="/auth/logout">,
 * and that prefetch would run the handler and clear the cookie (accidental logout).
 */
export default function LogoutPage() {
  useEffect(() => {
    let cancelled = false

    const doLogout = async () => {
      try {
        const res = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
        const data = await res.json()
        if (cancelled) return
        if (data.returnedToAdmin) {
          window.location.href = '/admin'
        } else {
          window.location.href = '/'
        }
      } catch {
        if (!cancelled) window.location.href = '/'
      }
    }

    doLogout()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Logging out...</p>
    </div>
  )
}
