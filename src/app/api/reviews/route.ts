import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { recomputeProductRating } from '@/lib/product-reviews'

/**
 * GET /api/reviews?productId=... — public list of reviews for a product.
 */
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('productId')
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id, rating, title, comment, images, isVerified, createdAt,
        user:users!reviews_userId_fkey ( id, name, avatar )
      `)
      .eq('productId', productId)
      .order('createdAt', { ascending: false })

    if (error) throw error

    const reviews = (data || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      images: r.images || [],
      isVerified: r.isVerified,
      createdAt: r.createdAt,
      user: {
        name: r.user?.name || 'Anonymous',
        avatar: r.user?.avatar || null,
      },
    }))

    const total = reviews.length
    const average = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0

    return NextResponse.json({ reviews, total, average: Math.round(average * 10) / 10 })
  } catch (e) {
    console.error('GET /api/reviews', e)
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}

/**
 * POST /api/reviews — create a review. Requires a delivered/completed order
 * from the current user that contains the product (verified purchase).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const productId = typeof body?.productId === 'string' ? body.productId : ''
    const rating = Number(body?.rating)
    const title = typeof body?.title === 'string' ? body.title.trim() : null
    const comment = typeof body?.comment === 'string' ? body.comment.trim() : null

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Verify the user purchased this product in a delivered/completed order.
    const { data: purchased, error: purchaseError } = await supabaseAdmin
      .from('order_items')
      .select('id, order:orders!inner ( userId, status )')
      .eq('productId', productId)
      .eq('orders.userId', session.userId)
      .in('orders.status', ['DELIVERED', 'COMPLETED'])
      .limit(1)

    if (purchaseError) throw purchaseError
    if (!purchased || purchased.length === 0) {
      return NextResponse.json(
        { error: 'You can only review products from delivered orders' },
        { status: 403 }
      )
    }

    // Enforce one review per user per product (upsert-like behaviour).
    const { data: existing } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('userId', session.userId)
      .eq('productId', productId)
      .maybeSingle()

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('reviews')
        .update({ rating, title, comment, isVerified: true, updatedAt: new Date().toISOString() })
        .eq('id', existing.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabaseAdmin.from('reviews').insert({
        userId: session.userId,
        productId,
        rating,
        title,
        comment,
        isVerified: true,
      })
      if (insertError) throw insertError
    }

    await recomputeProductRating(productId)

    return NextResponse.json({ success: true, updated: !!existing })
  } catch (e) {
    console.error('POST /api/reviews', e)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
