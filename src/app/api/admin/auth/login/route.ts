import { NextRequest, NextResponse } from 'next/server'
import { login, createExclusiveSession, setExclusiveSessionCookie, UserRole } from '@/lib/auth'
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
          // Fetch user from database to check role
          const { data: appUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role, status')
            .eq('id', data.user.id)
            .single()

          // CRITICAL: Only allow ADMIN or MANAGER roles
          if (userError || !appUser) {
            console.error('[ADMIN LOGIN] User not found in database:', {
              userId: data.user.id,
              email: email,
              error: userError
            })
            return NextResponse.json(
              { error: 'Admin access denied. Account not found in database.' },
              { status: 403 }
            )
          }

          // Check role (case-insensitive comparison for robustness)
          const userRole = String(appUser.role || '').toUpperCase().trim()
          const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER
          
          console.log('[ADMIN LOGIN] Role check:', {
            email: appUser.email,
            role: appUser.role,
            normalizedRole: userRole,
            isAdmin: isAdmin,
            expectedRoles: [UserRole.ADMIN, UserRole.MANAGER]
          })
          
          if (!isAdmin) {
            console.warn('[ADMIN LOGIN] Access denied for non-admin user:', {
              email: appUser.email,
              role: appUser.role,
              normalizedRole: userRole,
              userId: appUser.id
            })
            return NextResponse.json(
              { error: `Admin access denied. Your account role is "${appUser.role}". Only ADMIN or MANAGER roles can access the admin portal.` },
              { status: 403 }
            )
          }

          // Check account status
          if (appUser.status === 'BANNED') {
            return NextResponse.json(
              { error: 'Your account has been banned' },
              { status: 403 }
            )
          }

          if (appUser.status === 'SUSPENDED') {
            return NextResponse.json(
              { error: 'Your account has been suspended' },
              { status: 403 }
            )
          }

          // Kick every other browser / device for this admin account
          try {
            await supabase.auth.signOut({ scope: 'others' })
          } catch (e) {
            console.warn('[ADMIN LOGIN] signOut(others) failed:', e)
          }

          const sessionId = await createExclusiveSession(appUser.id, {
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            userAgent: request.headers.get('user-agent'),
          })

          const response = NextResponse.json({
            success: true,
            user: {
              id: appUser.id,
              email: appUser.email,
              name: appUser.name,
              role: appUser.role,
            },
          })
          applyCookiesToResponse(response, cookiesToSet)
          setExclusiveSessionCookie(response, sessionId)
          return response
        }
        
        if (error?.message && !error.message.toLowerCase().includes('invalid') && !error.message.toLowerCase().includes('credentials')) {
          const res = NextResponse.json({ error: error.message }, { status: 401 })
          applyCookiesToResponse(res, cookiesToSet)
          return res
        }
      } catch (e) {
        console.warn('[ADMIN LOGIN] Supabase Auth attempt failed, trying legacy:', e)
      }
    }

    // 2) Legacy JWT login (existing users without Supabase Auth)
    const result = await login(email, password)
    if (!result.success || !result.user) {
      const errorMessage = result.error || 'Invalid email or password'
      const statusCode = errorMessage.includes('Database connection') || errorMessage.includes('Supabase') ? 503 : 401
      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }

    // CRITICAL: Verify role for legacy login too (case-insensitive)
    const userRole = String(result.user.role || '').toUpperCase().trim()
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER
    
    console.log('[ADMIN LOGIN] Legacy login role check:', {
      email: result.user.email,
      role: result.user.role,
      normalizedRole: userRole,
      isAdmin: isAdmin,
      expectedRoles: [UserRole.ADMIN, UserRole.MANAGER]
    })
    
    if (!isAdmin) {
      console.warn('[ADMIN LOGIN] Legacy login access denied for non-admin user:', {
        email: result.user.email,
        role: result.user.role,
        normalizedRole: userRole,
        userId: result.user.id
      })
      return NextResponse.json(
        { error: `Admin access denied. Your account role is "${result.user.role || 'not set'}". Only ADMIN or MANAGER roles can access the admin portal.` },
        { status: 403 }
      )
    }

    const res = NextResponse.json({ success: true, user: result.user })
    if (result.token) {
      res.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
    if (result.sessionId) {
      setExclusiveSessionCookie(res, result.sessionId)
    }
    return res
  } catch (error) {
    console.error('[ADMIN LOGIN] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
