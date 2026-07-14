import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET: current user profile (for edit form)
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, avatar, phone')
      .eq('id', session.userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      phone: user.phone ?? '',
    })
  } catch (e) {
    console.error('GET /api/account/profile', e)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

/**
 * PATCH: update current user profile (name, email, phone, avatar)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, phone, avatar } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (email !== undefined) updateData.email = String(email).trim()
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null
    if (avatar !== undefined) updateData.avatar = avatar ? String(avatar).trim() : null

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', session.userId)
      .select('id, name, email, avatar, phone')
      .single()

    if (error) throw error

    return NextResponse.json({ user })
  } catch (e) {
    console.error('PATCH /api/account/profile', e)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
