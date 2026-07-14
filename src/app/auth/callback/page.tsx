'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

/**
 * Supabase redirects here after email confirmation (and similar flows) with
 * #access_token=... in the URL. The browser client recovers the session from
 * the hash, then we redirect to home with a clean URL.
 *
 * In Supabase Dashboard → Authentication → URL Configuration:
 * - Set Site URL to your production URL + /auth/callback, e.g.:
 *   https://zalora-fashion.netlify.app/auth/callback
 * - Add Redirect URLs: https://zalora-fashion.netlify.app/**
 */
export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Confirming your email…')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        // Recover session from URL hash (access_token, refresh_token, etc.)
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session) {
          setMessage('Success! Redirecting…')
          // Redirect to home with clean URL (no hash)
          const base = typeof window !== 'undefined' ? window.location.origin : ''
          window.location.replace(base + '/')
          return
        }
        // No session in URL or already consumed — go home
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        window.location.replace(base + '/')
      } catch {
        if (!cancelled) {
          const base = typeof window !== 'undefined' ? window.location.origin : ''
          window.location.replace(base + '/')
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
