import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Public API: list active categories (for search modal "Popular Categories", nav, etc.)
 */
export async function GET() {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug')
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })
      .limit(12)

    if (error) throw error

    return NextResponse.json({ categories: categories || [] })
  } catch (error) {
    console.error('GET /api/categories', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
