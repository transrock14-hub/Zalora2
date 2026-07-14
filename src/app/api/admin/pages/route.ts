import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

// GET all CMS pages
export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data: pages, error } = await supabaseAdmin
      .from('pages')
      .select('*')
      .order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ pages: pages || [] })
  } catch (error) {
    console.error('Fetch pages error:', error)
    return NextResponse.json({ message: 'Failed to fetch pages' }, { status: 500 })
  }
}

// POST - Create new CMS page
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, title, content, metaTitle, metaDesc, isActive } = body

    if (!title || !content) {
      return NextResponse.json(
        { message: 'Title and content are required' },
        { status: 400 }
      )
    }

    const normalizedSlug = slugify(slug || title)

    // Ensure unique slug
    const { data: existing } = await supabaseAdmin
      .from('pages')
      .select('id')
      .eq('slug', normalizedSlug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { message: 'A page with this slug already exists' },
        { status: 409 }
      )
    }

    const { data: page, error } = await supabaseAdmin
      .from('pages')
      .insert({
        slug: normalizedSlug,
        title,
        content,
        metaTitle: metaTitle || null,
        metaDesc: metaDesc || null,
        isActive: isActive !== undefined ? isActive : true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Page created successfully', page })
  } catch (error) {
    console.error('Create page error:', error)
    return NextResponse.json({ message: 'Failed to create page' }, { status: 500 })
  }
}
