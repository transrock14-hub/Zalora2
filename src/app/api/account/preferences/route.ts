import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export interface AccountPreferences {
  orderUpdates: boolean
  promotions: boolean
  newsletter: boolean
  profileVisibility: boolean
  activityStatus: boolean
}

const DEFAULT_PREFERENCES: AccountPreferences = {
  orderUpdates: true,
  promotions: true,
  newsletter: false,
  profileVisibility: false,
  activityStatus: true,
}

const PREFERENCE_KEYS = Object.keys(DEFAULT_PREFERENCES) as (keyof AccountPreferences)[]

function normalize(raw: unknown): AccountPreferences {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const result = { ...DEFAULT_PREFERENCES }
  for (const key of PREFERENCE_KEYS) {
    if (typeof source[key] === 'boolean') result[key] = source[key] as boolean
  }
  return result
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('preferences')
      .eq('id', session.userId)
      .single()

    if (error) {
      // Column may not exist yet; fall back to defaults instead of failing the page.
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
    }

    return NextResponse.json({ preferences: normalize(data?.preferences) })
  } catch (e) {
    console.error('GET /api/account/preferences', e)
    return NextResponse.json({ preferences: DEFAULT_PREFERENCES })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const { data: current } = await supabaseAdmin
      .from('users')
      .select('preferences')
      .eq('id', session.userId)
      .single()

    const merged = normalize({ ...normalize(current?.preferences), ...body })

    const { error } = await supabaseAdmin
      .from('users')
      .update({ preferences: merged, updatedAt: new Date().toISOString() })
      .eq('id', session.userId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save preferences. The preferences column may be missing — run supabase-preferences-migration.sql.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ preferences: merged })
  } catch (e) {
    console.error('PATCH /api/account/preferences', e)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}
