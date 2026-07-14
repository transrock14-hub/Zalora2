import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase not configured')
      return NextResponse.json(
        { error: 'Database not configured', user: null },
        { status: 503 }
      )
    }

    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      )
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Get user error:', error)
    
    const errorMessage = error?.message || 'Internal server error'
    const isDatabaseError = errorMessage.includes('Supabase') || 
                           errorMessage.includes('connection')
    
    return NextResponse.json(
      { 
        error: isDatabaseError ? 'Database connection error' : 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        user: null
      },
      { status: isDatabaseError ? 503 : 500 }
    )
  }
}
