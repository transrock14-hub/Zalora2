'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useUserStore } from '@/lib/store'

export function AuthSync() {
  const pathname = usePathname()
  const setUser = useUserStore((state) => state.setUser)
  const clearUser = useUserStore((state) => state.clearUser)

  // Clear client user on login/logout so we never show a stale session.
  // Do NOT clear user when /api/auth/me returns 401 or null on normal pages —
  // on serverless the cookie can fail to read briefly (cold start).
  useEffect(() => {
    if (pathname === '/auth/logout' || pathname === '/auth/login' || pathname === '/admin/login') {
      if (pathname === '/auth/logout') clearUser()
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
