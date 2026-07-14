import { NextRequest, NextResponse } from 'next/server'
import { logout, setExclusiveSessionCookie } from '@/lib/auth'
import {
  createSupabaseRouteHandlerClient,
  applyCookiesToResponse,
} from '@/lib/supabase-server'

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

async function buildLogoutResponse(request: NextRequest, redirect?: string) {
  const result = await logout()

  // Returning to admin after impersonation: restore JWT + exclusive session
  if (result.returnedToAdmin && result.token) {
    const res = redirect
      ? NextResponse.redirect(new URL(redirect, request.url))
      : NextResponse.json({ success: true, returnedToAdmin: true })
    res.cookies.set('auth-token', result.token, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    })
    setExclusiveSessionCookie(res, result.sessionId ?? null)
    return res
  }

  const res = redirect
    ? NextResponse.redirect(new URL(redirect, request.url))
    : NextResponse.json({ success: true, returnedToAdmin: false })

  // Clear legacy JWT
  res.cookies.set('auth-token', '', {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 0,
  })
  setExclusiveSessionCookie(res, null)

  // Clear Supabase Auth session cookies
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { supabase, cookiesToSet } = await createSupabaseRouteHandlerClient(request)
      await supabase.auth.signOut()
      applyCookiesToResponse(res, cookiesToSet)
    }
  } catch (e) {
    console.warn('[logout] Supabase signOut failed:', e)
  }

  // Best-effort: expire any remaining sb-* cookies from the request
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      res.cookies.set(cookie.name, '', {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: 0,
      })
    }
  }

  return res
}

export async function POST(request: NextRequest) {
  try {
    return await buildLogoutResponse(request)
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    return await buildLogoutResponse(request, '/')
  } catch {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
