import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('withdrawal_requests')
      .select(`
        *,
        user:users!withdrawal_requests_userId_fkey (id, name, email)
      `)
      .eq('hiddenFromAdmin', false)
      .order('createdAt', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    let { data: rows, error } = await query

    if (
      error &&
      (error.message?.includes('hiddenFromAdmin') || (error as { code?: string }).code === 'PGRST204')
    ) {
      let fallback = supabaseAdmin
        .from('withdrawal_requests')
        .select(`
          *,
          user:users!withdrawal_requests_userId_fkey (id, name, email)
        `)
        .order('createdAt', { ascending: false })
      if (status) fallback = fallback.eq('status', status)
      const retry = await fallback
      rows = retry.data
      error = retry.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ withdrawals: rows || [] })
  } catch (e) {
    console.error('GET /api/admin/withdrawals', e)
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}
