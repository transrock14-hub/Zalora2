import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id, rating, title, comment, isVerified, createdAt, productId,
        user:users!reviews_userId_fkey ( id, name, email, avatar ),
        product:products!reviews_productId_fkey ( id, name, slug )
      `)
      .order('createdAt', { ascending: false })

    if (error) throw error

    const reviews = (data || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      isVerified: r.isVerified,
      createdAt: r.createdAt,
      productId: r.productId,
      user: {
        name: r.user?.name || 'Anonymous',
        email: r.user?.email || '',
        avatar: r.user?.avatar || null,
      },
      product: {
        id: r.product?.id,
        name: r.product?.name || 'Unknown product',
        slug: r.product?.slug || '',
      },
    }))

    return NextResponse.json({ reviews })
  } catch (e) {
    console.error('GET /api/admin/reviews', e)
    return NextResponse.json({ message: 'Failed to fetch reviews' }, { status: 500 })
  }
}
