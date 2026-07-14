import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: verification, error } = await supabaseAdmin
      .from('shop_verifications')
      .select('id, shopId, status, rejectionReason, reviewedAt, createdAt')
      .eq('userId', session.userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!verification) {
      return NextResponse.json({
        hasVerification: false,
        verification: null,
        shop: null,
      })
    }

    let shop = null
    if (verification.shopId) {
      const { data: shopData } = await supabaseAdmin
        .from('shops')
        .select('id, name, slug, status')
        .eq('id', verification.shopId)
        .single()
      shop = shopData
    }

    return NextResponse.json({
      hasVerification: true,
      verification: {
        id: verification.id,
        shopId: verification.shopId,
        status: verification.status,
        rejectionReason: verification.rejectionReason,
        reviewedAt: verification.reviewedAt,
        createdAt: verification.createdAt,
      },
      shop,
    })
  } catch (error) {
    console.error('Error fetching verification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    )
  }
}
