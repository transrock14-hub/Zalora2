import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchPrimaryImageMap, mapProductCard } from '@/lib/product-list'

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
    const imageMap = await fetchPrimaryImageMap(productIds)

    const products = (rows || []).map((p: any) =>
      mapProductCard(p, imageMap[p.id] || '/images/logo.png')
    )

    return NextResponse.json({ products })
  } catch (e) {
    console.error('GET /api/store/products', e)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
