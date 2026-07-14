import { NextResponse } from 'next/server'
import { logout } from '@/lib/auth'

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
}

export async function POST() {
  try {
    const result = await logout()

    const res = NextResponse.json({
      success: true,
      returnedToAdmin: result.returnedToAdmin || false,
    })

    if (result.token) {
      res.cookies.set('auth-token', result.token, {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 7,
      })
    } else {
      res.cookies.set('auth-token', '', {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: 0,
      })
    }
    return res
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const result = await logout()
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = NextResponse.redirect(new URL('/', base))
    if (result.token) {
      res.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    } else {
      res.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
    }
    return res
  } catch {
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
  }
}
