'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useUserStore } from '@/lib/store'

export function AuthSync() {
  const pathname = usePathname()
  const setUser = useUserStore((state) => state.setUser)
  const clearUser = useUserStore((state) => state.clearUser)

  // Clear client user only on login/logout pages so after logout we don't show stale user.
  // Do NOT clear user when /api/auth/me returns 401 or null — on Netlify/serverless the server
  // can fail to read the cookie (cold start, etc.) and we must not wipe the client state or
  // the UI will show "Log in" and clicking Account/Orders will redirect to login.
  useEffect(() => {
    // Clear user only on logout page
    if (pathname === '/auth/logout') {
      clearUser()
      return
    }
    
    // Don't sync on login pages (they handle their own auth)
    if (pathname === '/auth/login' || pathname === '/admin/login') {
      return
    }
    
    // Skip sync on public pages that don't need auth
    if (
      pathname?.startsWith('/auth/') ||
      pathname === '/maintenance' ||
      pathname?.startsWith('/products') ||
      pathname?.startsWith('/categories')
    ) {
      return
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()

        if (res.ok && data.user) {
          setUser(data.user)
        }
        // Do not clear user on 401 or 200+null: server may have failed to read the cookie.
        // Protected routes (/account, /seller, /checkout) will redirect server-side if needed.
      } catch {
        // Don't clear user on network error; server will redirect on protected routes if needed
      }
    }

    checkAuth()
  }, [pathname, setUser, clearUser])

  return null
}
