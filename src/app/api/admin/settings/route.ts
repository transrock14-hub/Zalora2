import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole } from '@/lib/auth'
import { isSensitiveKey, invalidateSettingsCache } from '@/lib/settings'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== UserRole.ADMIN && session.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: settings, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')
    
    if (error) {
      throw error
    }
    
    const settingsMap: Record<string, string> = {}
    settings?.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Only admins can update settings' }, { status: 403 })
    }

    const settings = await request.json()

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value !== 'string') continue

      // Never overwrite a stored secret with an empty value. This lets the admin
      // UI show a "leave blank to keep unchanged" placeholder for passwords/keys.
      if (isSensitiveKey(key) && value === '') continue

      await supabaseAdmin
        .from('settings')
        .upsert({
          key,
          value: String(value),
          type: 'string',
        }, {
          onConflict: 'key',
        })
    }

    invalidateSettingsCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
