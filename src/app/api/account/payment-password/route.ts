import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyPassword, hashPassword } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET: whether the current user has a payment password set.
 * POST: set or change payment (withdraw) password.
 * Body: { newPassword: string, currentPassword?: string }
 * - If a payment password already exists, currentPassword is required.
 * - If none exists yet, only newPassword is required (first-time set).
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('paymentPassword')
      .eq('id', session.userId)
      .maybeSingle()

    if (error) {
      if (
        (error as { code?: string }).code === 'PGRST204' ||
        error.message?.includes('paymentPassword')
      ) {
        return NextResponse.json(
          {
            error:
              'paymentPassword column is missing. Run supabase-payment-password-migration.sql in Supabase SQL Editor.',
            hasPaymentPassword: false,
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Failed to load payment password status' }, { status: 500 })
    }

    return NextResponse.json({
      hasPaymentPassword: Boolean(
        (user as { paymentPassword?: string | null } | null)?.paymentPassword
      ),
    })
  } catch (e) {
    console.error('GET /api/account/payment-password', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const currentPassword =
      typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword.trim() : ''

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New payment password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, paymentPassword')
      .eq('id', session.userId)
      .maybeSingle()

    if (userError) {
      if (
        (userError as { code?: string }).code === 'PGRST204' ||
        userError.message?.includes('paymentPassword')
      ) {
        return NextResponse.json(
          {
            error:
              'paymentPassword column is missing. Run supabase-payment-password-migration.sql in Supabase SQL Editor.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const stored = (user as { paymentPassword?: string | null }).paymentPassword
    if (stored) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current payment password is required' },
          { status: 400 }
        )
      }
      const ok = await verifyPassword(currentPassword, stored)
      if (!ok) {
        return NextResponse.json(
          { error: 'Current payment password is incorrect' },
          { status: 400 }
        )
      }
    }

    const hashed = await hashPassword(newPassword)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ paymentPassword: hashed, updatedAt: new Date().toISOString() })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update payment password' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: stored ? 'Payment password updated' : 'Payment password set',
    })
  } catch (e) {
    console.error('POST /api/account/payment-password', e)
    return NextResponse.json({ error: 'Failed to change payment password' }, { status: 500 })
  }
}
