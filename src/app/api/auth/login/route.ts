import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { createSupabaseRouteHandlerClient, applyCookiesToResponse } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Database not configured. Please set Supabase environment variables.', code: 'DATABASE_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 1) Try Supabase Auth (email provider) – sessions work on Netlify via @supabase/ssr cookies
    if (hasAnonKey) {
      try {
        const { supabase, cookiesToSet } = await createSupabaseRouteHandlerClient(request)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (!error && data?.user) {
          const { data: appUser } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role')
            .eq('id', data.user.id)
            .single()

          // Block admin/manager login via regular login endpoint
          if (appUser) {
            const userRole = String(appUser.role || '').toUpperCase().trim()
            if (userRole === 'ADMIN' || userRole === 'MANAGER') {
              return NextResponse.json(
                { error: 'Admin accounts must use the admin login page at /admin/login' },
                { status: 403 }
              )
            }
          }

          const response = NextResponse.json({
            success: true,
            user: appUser ? { id: appUser.id, email: appUser.email, name: appUser.name, role: appUser.role } : { id: data.user.id, email: data.user.email ?? email, name: data.user.user_metadata?.name ?? '', role: 'USER' },
          })
          applyCookiesToResponse(response, cookiesToSet)
          return response
        }
        if (error?.message && !error.message.toLowerCase().includes('invalid') && !error.message.toLowerCase().includes('credentials')) {
          const res = NextResponse.json({ error: error.message }, { status: 401 })
          applyCookiesToResponse(res, cookiesToSet)
          return res
        }
      } catch (e) {
        console.warn('[LOGIN] Supabase Auth attempt failed, trying legacy:', e)
      }
    }

    // 2) Legacy JWT login (existing users without Supabase Auth)
    const result = await login(email, password)
    if (!result.success || !result.user) {
      const errorMessage = result.error || 'Invalid email or password'
      const statusCode = errorMessage.includes('Database connection') || errorMessage.includes('Supabase') ? 503 : 401
      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }

    // Block admin/manager login via regular login endpoint
    const userRole = String(result.user.role || '').toUpperCase().trim()
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      return NextResponse.json(
        { error: 'Admin accounts must use the admin login page at /admin/login' },
        { status: 403 }
      )
    }

    const res = NextResponse.json({ success: true, user: result.user })
    if (result.token) {
      res.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
    return res
  } catch (error) {
    console.error('[LOGIN] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
