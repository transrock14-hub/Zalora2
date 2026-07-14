import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server'
import { isValidEmail } from '@/lib/utils'

/**
 * POST: send a password reset email via Supabase Auth.
 * Always responds with success to avoid leaking which emails are registered.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Password reset is not available right now. Please contact support.' },
        { status: 503 }
      )
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      new URL(request.url).origin

    const { supabase } = await createSupabaseRouteHandlerClient(request)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password`,
    })

    // Don't reveal errors tied to whether the email exists.
    if (error) {
      console.warn('[FORGOT_PASSWORD] resetPasswordForEmail error:', error.message)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/auth/forgot-password', e)
    // Still return success to avoid enumeration; log server-side.
    return NextResponse.json({ success: true })
  }
}
