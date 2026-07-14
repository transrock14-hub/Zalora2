import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyPassword, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createSupabaseRouteHandlerClient, applyCookiesToResponse } from '@/lib/supabase-server'

const SUPABASE_AUTH_PASSWORD_PLACEHOLDER = '$supabase-auth$'

/**
 * POST: change the current user's password.
 * Handles both Supabase Auth users (new signups) and legacy bcrypt users (seeded/imported).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from the current one' }, { status: 400 })
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password')
      .eq('id', session.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isSupabaseAuthUser = user.password === SUPABASE_AUTH_PASSWORD_PLACEHOLDER

    if (isSupabaseAuthUser) {
      // Verify current password by re-authenticating, then update via Supabase Auth.
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return NextResponse.json({ error: 'Password changes are not available right now' }, { status: 503 })
      }
      const { supabase, cookiesToSet } = await createSupabaseRouteHandlerClient(request)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        return NextResponse.json({ error: updateError.message || 'Failed to update password' }, { status: 400 })
      }

      const response = NextResponse.json({ success: true })
      applyCookiesToResponse(response, cookiesToSet)
      return response
    }

    // Legacy bcrypt user
    const isValid = await verifyPassword(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const hashed = await hashPassword(newPassword)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashed, updatedAt: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/account/password', e)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
