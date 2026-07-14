import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: setting, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json({ enabled: setting?.value === 'true' })
  } catch (error) {
    return NextResponse.json({ enabled: false })
  }
}

export const dynamic = 'force-dynamic'
