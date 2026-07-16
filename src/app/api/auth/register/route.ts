import { NextRequest, NextResponse } from 'next/server'
import { register, createExclusiveSession, setExclusiveSessionCookie } from '@/lib/auth'
import { isValidEmail } from '@/lib/utils'
import { notifyAdmins } from '@/lib/notifications'
import { createSupabaseRouteHandlerClient, applyCookiesToResponse } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

const SUPABASE_AUTH_PASSWORD_PLACEHOLDER = '$supabase-auth$'

export async function POST(request: NextRequest) {
  try {
    let body: { name?: string; email?: string; password?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body. Please try again.' },
        { status: 400 }
      )
    }
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
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

    // 1) New users via Admin API (bypasses public signUp email rate limits that
    // trip after ~2 attempts when confirmation emails are enabled), then sign in
    // to establish the session cookies.
    if (hasAnonKey) {
      try {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name },
        })

        if (createError) {
          const msg = (createError.message || '').toLowerCase()
          if (
            msg.includes('already registered') ||
            msg.includes('already exists') ||
            msg.includes('duplicate') ||
            msg.includes('user already')
          ) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
          }
          // Fall through to legacy register for unexpected auth errors
          console.warn('[REGISTER] admin.createUser failed, trying legacy:', createError.message)
        } else if (created?.user) {
          const { error: insertError } = await supabaseAdmin.from('users').insert({
            id: created.user.id,
            email: created.user.email ?? email,
            name,
            password: SUPABASE_AUTH_PASSWORD_PLACEHOLDER,
            role: 'USER',
            status: 'ACTIVE',
          })

          if (insertError) {
            if (insertError.code === '23505') {
              return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
            }
            // Roll back orphaned auth user so they can retry cleanly
            try {
              await supabaseAdmin.auth.admin.deleteUser(created.user.id)
            } catch (rollbackErr) {
              console.error('[REGISTER] Rollback auth user failed:', rollbackErr)
            }
            console.error('[REGISTER] Insert app user error:', insertError)
            return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
          }

          try {
            await notifyAdmins({
              title: 'New user registered',
              message: `${name} (${email}) just signed up`,
              type: 'system',
              link: '/admin/users',
            })
          } catch (e) {
            console.error('Notify admins error:', e)
          }

          const { supabase, cookiesToSet } = await createSupabaseRouteHandlerClient(request)
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) {
            console.warn('[REGISTER] User created but auto sign-in failed:', signInError.message)
          }

          const response = NextResponse.json({
            success: true,
            user: {
              id: created.user.id,
              email: created.user.email ?? email,
              name,
              role: 'USER',
            },
          })
          applyCookiesToResponse(response, cookiesToSet)
          const sessionId = await createExclusiveSession(created.user.id, {
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            userAgent: request.headers.get('user-agent'),
          })
          setExclusiveSessionCookie(response, sessionId)
          return response
        }
      } catch (e) {
        console.warn('[REGISTER] Supabase Auth createUser failed, trying legacy:', e)
      }
    }

    // 2) Legacy register (no anon key or Supabase signUp failed)
    const result = await register({ name, email, password })
    if (!result.success) {
      const errorMessage = result.error || 'Registration failed'
      const statusCode = errorMessage.includes('Database connection') || errorMessage.includes('Supabase') ? 503 : 400
      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }

    try {
      await notifyAdmins({
        title: 'New user registered',
        message: `${result.user?.name || email} (${email}) just signed up`,
        type: 'system',
        link: '/admin/users',
      })
    } catch (e) {
      console.error('Notify admins error:', e)
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
    console.error('[REGISTER] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
