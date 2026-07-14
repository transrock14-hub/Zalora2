import { NextResponse } from 'next/server'
import { getSession, UserRole } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTestEmail } from '@/lib/email'
import { getEmailConfig } from '@/lib/settings'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== UserRole.ADMIN && session.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    let to: string | undefined = typeof body?.to === 'string' ? body.to.trim() : undefined

    // Default to the admin's own email if no recipient provided.
    if (!to && session.userId) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', session.userId)
        .single()
      to = data?.email
    }

    if (!to) {
      return NextResponse.json({ error: 'No recipient email available' }, { status: 400 })
    }

    const config = await getEmailConfig()
    if (!config.enabled || !config.host || !config.user || !config.password) {
      return NextResponse.json(
        {
          error:
            'Email is not fully configured. Enable transactional email and set SMTP host, user, and password, then save before testing.',
        },
        { status: 400 }
      )
    }

    const sent = await sendTestEmail(to)
    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send test email. Check your SMTP credentials and server logs.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, to })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
