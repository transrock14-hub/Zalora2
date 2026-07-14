import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { createInvitationCode, type InvitationCodeType } from '@/lib/invitation-codes'

async function enrichCodes(
  rows: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  const ids = new Set<string>()
  for (const r of rows) {
    if (typeof r.referrerUserId === 'string' && r.referrerUserId) ids.add(r.referrerUserId)
    if (typeof r.usedByUserId === 'string' && r.usedByUserId) ids.add(r.usedByUserId)
    if (typeof r.createdById === 'string' && r.createdById) ids.add(r.createdById)
  }
  if (ids.size === 0) return rows.map((r) => ({ ...r, referrer: null, usedBy: null, createdBy: null }))

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .in('id', Array.from(ids))

  const byId = new Map((users || []).map((u) => [u.id, u]))
  return rows.map((r) => ({
    ...r,
    referrer: r.referrerUserId ? byId.get(r.referrerUserId as string) || null : null,
    usedBy: r.usedByUserId ? byId.get(r.usedByUserId as string) || null : null,
    createdBy: r.createdById ? byId.get(r.createdById as string) || null : null,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = request.nextUrl.searchParams.get('status') // unused | used | all
    let query = supabaseAdmin
      .from('invitation_codes')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(200)

    if (status === 'unused') {
      query = query.is('usedByUserId', null)
    } else if (status === 'used') {
      query = query.not('usedByUserId', 'is', null)
    }

    const { data, error } = await query
    if (error) throw error

    const codes = await enrichCodes((data || []) as Array<Record<string, unknown>>)
    return NextResponse.json({ codes })
  } catch (e) {
    console.error('[invitation-codes GET]', e)
    return NextResponse.json({ error: 'Failed to load codes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const type = String(body?.type || '').toUpperCase() as InvitationCodeType
    const note = typeof body?.note === 'string' ? body.note : null
    const referrerUserId =
      typeof body?.referrerUserId === 'string' && body.referrerUserId.trim()
        ? body.referrerUserId.trim()
        : null

    if (type !== 'DIRECT' && type !== 'REFERRAL') {
      return NextResponse.json(
        { error: 'type must be DIRECT or REFERRAL' },
        { status: 400 }
      )
    }

    if (type === 'REFERRAL') {
      if (!referrerUserId) {
        return NextResponse.json(
          { error: 'Select the user who will receive this referral code' },
          { status: 400 }
        )
      }
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', referrerUserId)
        .maybeSingle()
      if (!referrer) {
        return NextResponse.json({ error: 'Referrer user not found' }, { status: 404 })
      }
    }

    const row = await createInvitationCode({
      type,
      createdById: session.userId,
      referrerUserId,
      note,
    })

    return NextResponse.json({ code: row })
  } catch (e) {
    console.error('[invitation-codes POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate code' },
      { status: 500 }
    )
  }
}
