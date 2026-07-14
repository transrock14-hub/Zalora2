import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * One-time fix endpoint to update a user's role to ADMIN
 * This helps fix admin login issues when role is incorrectly set
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newRole = 'ADMIN' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER']
    const role = String(newRole).toUpperCase().trim()
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Fetch user first
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('email', email)
      .single()

    if (fetchError || !user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          details: fetchError?.message 
        },
        { status: 404 }
      )
    }

    // Update role
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: role })
      .eq('id', user.id)
      .select('id, email, name, role, status')
      .single()

    if (updateError) {
      console.error('[FIX ADMIN ROLE] Update error:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update role',
          details: updateError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${email} role from "${user.role}" to "${role}"`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status
      }
    })
  } catch (error) {
    console.error('[FIX ADMIN ROLE] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
