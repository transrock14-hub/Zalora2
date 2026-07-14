import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Public API: list published products, optionally by categoryId.
 * Used by store categories page to show products when a category is selected.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 24)

    let query = supabaseAdmin
      .from('products')
      .select('id, name, slug, price, comparePrice, rating, totalReviews')
      .eq('status', 'PUBLISHED')
      .order('createdAt', { ascending: false })
      .limit(limit)

    if (categoryId) {
      query = query.eq('categoryId', categoryId)
    }

    const { data: rows, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const productIds = (rows || []).map((p: any) => p.id)
    let imageMap: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: images } = await supabaseAdmin
        .from('product_images')
        .select('productId, url, isPrimary')
        .in('productId', productIds)
        .order('isPrimary', { ascending: false })
      const byProduct = (images || []).reduce((acc: Record<string, string>, img: any) => {
        if (!acc[img.productId]) acc[img.productId] = img.url
        return acc
      }, {})
      imageMap = byProduct
    }

    const products = (rows || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      rating: Number(p.rating || 0),
      reviews: Number(p.totalReviews || 0),
      image: imageMap[p.id] || '/images/logo.png',
    }))

    return NextResponse.json({ products })
  } catch (e) {
    console.error('GET /api/store/products', e)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
