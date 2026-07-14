import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { revalidateStorefront } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  try {
    const auth = await getSession()

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('sortOrder', { ascending: true })

    if (error) {
      throw error
    }

    // Get product counts for each category
    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (category) => {
        const { count } = await supabaseAdmin
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('categoryId', category.id)
        
        return {
          ...category,
          _count: {
            products: count || 0,
          },
        }
      })
    )

    return NextResponse.json({ categories: categoriesWithCounts })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getSession()

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      slug,
      description,
      icon,
      image,
      isActive,
      showOnHome,
      parentId,
    } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Check if slug already exists
    const { data: existing } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    // Get the highest sort order
    const { data: lastCategory } = await supabaseAdmin
      .from('categories')
      .select('sortOrder')
      .order('sortOrder', { ascending: false })
      .limit(1)
      .single()

    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .insert({
        name,
        slug,
        description: description || null,
        icon: icon || null,
        image: image || null,
        isActive: isActive !== undefined ? isActive : true,
        showOnHome: showOnHome !== undefined ? showOnHome : true,
        parentId: parentId || null,
        sortOrder: (lastCategory?.sortOrder || 0) + 1,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidateStorefront(['home', 'categories'])
    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
