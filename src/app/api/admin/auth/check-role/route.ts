import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Diagnostic endpoint to check a user's role by email
 * This helps debug admin login issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Fetch user by email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, status')
      .eq('email', email)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          details: error?.message 
        },
        { status: 404 }
      )
    }

    const normalizedRole = String(user.role || '').toUpperCase().trim()
    const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER'

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        normalizedRole: normalizedRole,
        status: user.status,
        isAdmin: isAdmin,
        canAccessAdmin: isAdmin
      },
      message: isAdmin 
        ? 'User has admin privileges' 
        : `User role is "${user.role}". To grant admin access, update role to "ADMIN" or "MANAGER" in database.`
    })
  } catch (error) {
    console.error('[CHECK ROLE] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
