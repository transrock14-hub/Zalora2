import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { slugify } from '@/lib/utils'

// PUT - Update CMS page
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, title, content, metaTitle, metaDesc, isActive } = body

    const updateData: Record<string, unknown> = {}

    if (slug !== undefined) {
      const normalizedSlug = slugify(slug)
      const { data: existing } = await supabaseAdmin
        .from('pages')
        .select('id')
        .eq('slug', normalizedSlug)
        .neq('id', params.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { message: 'A page with this slug already exists' },
          { status: 409 }
        )
      }
      updateData.slug = normalizedSlug
    }

    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle || null
    if (metaDesc !== undefined) updateData.metaDesc = metaDesc || null
    if (isActive !== undefined) updateData.isActive = isActive
    updateData.updatedAt = new Date().toISOString()

    const { data: page, error } = await supabaseAdmin
      .from('pages')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Page updated successfully', page })
  } catch (error) {
    console.error('Update page error:', error)
    return NextResponse.json({ message: 'Failed to update page' }, { status: 500 })
  }
}

// DELETE - Delete CMS page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('pages')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (error) {
    console.error('Delete page error:', error)
    return NextResponse.json({ message: 'Failed to delete page' }, { status: 500 })
  }
}
