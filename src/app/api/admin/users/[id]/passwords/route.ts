import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword, UserRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const SUPABASE_AUTH_PASSWORD_PLACEHOLDER = '$supabase-auth$'

/**
 * POST: Admin sets a user's login password and/or payment (withdraw) password.
 * Body: { loginPassword?: string, paymentPassword?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== UserRole.ADMIN && session.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const loginPassword =
      typeof body?.loginPassword === 'string' ? body.loginPassword.trim() : ''
    const paymentPassword =
      typeof body?.paymentPassword === 'string' ? body.paymentPassword.trim() : ''

    if (!loginPassword && !paymentPassword) {
      return NextResponse.json(
        { error: 'Provide a login password and/or payment password' },
        { status: 400 }
      )
    }
    if (loginPassword && loginPassword.length < 6) {
      return NextResponse.json(
        { error: 'Login password must be at least 6 characters' },
        { status: 400 }
      )
    }
    if (paymentPassword && paymentPassword.length < 6) {
      return NextResponse.json(
        { error: 'Payment password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password, role')
      .eq('id', params.id)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Managers cannot reset Admin passwords
    if (user.role === UserRole.ADMIN && session.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Only admins can change another admin password' },
        { status: 403 }
      )
    }

    const updated: string[] = []
    const patch: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    }

    if (loginPassword) {
      const isSupabaseAuthUser = user.password === SUPABASE_AUTH_PASSWORD_PLACEHOLDER
      if (isSupabaseAuthUser || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: loginPassword,
        })
        if (authErr) {
          // Fall back to legacy hash if Auth user does not exist
          console.warn('[admin passwords] Auth update failed, trying legacy:', authErr.message)
          patch.password = await hashPassword(loginPassword)
        } else {
          patch.password = SUPABASE_AUTH_PASSWORD_PLACEHOLDER
        }
      } else {
        patch.password = await hashPassword(loginPassword)
      }
      updated.push('login')
    }

    if (paymentPassword) {
      patch.paymentPassword = await hashPassword(paymentPassword)
      updated.push('payment')
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(patch)
      .eq('id', user.id)

    if (updateError) {
      const msg = updateError.message || ''
      if (msg.includes('paymentPassword') || (updateError as { code?: string }).code === 'PGRST204') {
        return NextResponse.json(
          {
            error:
              'paymentPassword column is missing. Run supabase-payment-password-migration.sql in Supabase SQL Editor, then try again.',
          },
          { status: 500 }
        )
      }
      console.error('[admin passwords] update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update passwords' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated,
      message: `Updated ${updated.join(' and ')} password${updated.length > 1 ? 's' : ''}`,
    })
  } catch (e) {
    console.error('POST /api/admin/users/[id]/passwords', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
