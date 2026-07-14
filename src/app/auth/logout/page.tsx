'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/lib/store'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

/**
 * Logout page: runs logout only when the user actually visits (client-side).
 * Do NOT use a GET route handler here — Next.js prefetches <Link href="/auth/logout">,
 * and that prefetch would run the handler and clear the cookie (accidental logout).
 *
 * Must clear BOTH the app JWT cookie and the Supabase Auth session; otherwise
 * AuthSync / getSession will immediately log the user back in.
 */
export default function LogoutPage() {
  const clearUser = useUserStore((s) => s.clearUser)

  useEffect(() => {
    let cancelled = false

    const doLogout = async () => {
      clearUser()

      let returnedToAdmin = false
      try {
        const res = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        returnedToAdmin = !!data.returnedToAdmin
      } catch {
        // continue — still clear browser session
      }

      // Clear client-side Supabase session (localStorage / cookies)
      if (!returnedToAdmin) {
        try {
          const supabase = createSupabaseBrowserClient()
          await supabase.auth.signOut({ scope: 'global' })
        } catch {
          // ignore if supabase not configured
        }
      }

      if (cancelled) return

      // Hard navigate so AuthSync doesn't restore a stale in-memory user
      window.location.replace(returnedToAdmin ? '/admin' : '/auth/login')
    }

    doLogout()
    return () => {
      cancelled = true
    }
  }, [clearUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Logging out...</p>
    </div>
  )
}
