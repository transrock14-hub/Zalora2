import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/** Lightweight user list for referral-code picker */
export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, status')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true })
      .limit(500)

    if (error) throw error

    const users = (data || []).filter((u) => u.role !== 'ADMIN')
    return NextResponse.json({ users })
  } catch (e) {
    console.error('[invitation-codes/users GET]', e)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
