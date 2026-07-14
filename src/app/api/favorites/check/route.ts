import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET: Check if current user has product in favorites. ?productId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ inCollection: false })
    }

    const productId = req.nextUrl.searchParams.get('productId')
    if (!productId) {
      return NextResponse.json(
        { message: 'productId is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('favorites')
      .select('userId')
      .eq('userId', session.userId)
      .eq('productId', productId)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ inCollection: !!data })
  } catch (error) {
    console.error('GET /api/favorites/check', error)
    return NextResponse.json(
      { message: 'Failed to check collection' },
      { status: 500 }
    )
  }
}
