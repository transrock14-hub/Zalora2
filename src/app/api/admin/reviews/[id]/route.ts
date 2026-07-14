import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { recomputeProductRating } from '@/lib/product-reviews'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data: review, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('id, productId')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError || !review) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', params.id)

    if (deleteError) throw deleteError

    await recomputeProductRating(review.productId)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/admin/reviews/[id]', e)
    return NextResponse.json({ message: 'Failed to delete review' }, { status: 500 })
  }
}
