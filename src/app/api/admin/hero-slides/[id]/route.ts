import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { revalidateStorefront } from '@/lib/revalidate'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getSession()

    if (!auth) {
      console.error('[Hero Slides PUT] No auth session found')
      return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 })
    }

    if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
      console.error(`[Hero Slides PUT] Insufficient permissions. Role: ${auth.role}, User: ${auth.email}`)
      return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      subtitle,
      image,
      mobileImage,
      ctaText,
      ctaLink,
      isActive,
      sortOrder,
      startsAt,
      endsAt,
    } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title || null
    if (subtitle !== undefined) updateData.subtitle = subtitle || null
    if (image !== undefined) updateData.image = image
    if (mobileImage !== undefined) updateData.mobileImage = mobileImage || null
    if (ctaText !== undefined) updateData.ctaText = ctaText || null
    if (ctaLink !== undefined) updateData.ctaLink = ctaLink || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt).toISOString() : null
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt).toISOString() : null

    const { data: slide, error } = await supabaseAdmin
      .from('hero_slides')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidateStorefront(['home', 'hero_slides'])
    return NextResponse.json({ slide })
  } catch (error) {
    console.error('Error updating hero slide:', error)
    return NextResponse.json({ error: 'Failed to update slide' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getSession()

    if (!auth) {
      console.error('[Hero Slides DELETE] No auth session found')
      return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 })
    }

    if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
      console.error(`[Hero Slides DELETE] Insufficient permissions. Role: ${auth.role}, User: ${auth.email}`)
      return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('hero_slides')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    revalidateStorefront(['home', 'hero_slides'])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting hero slide:', error)
    return NextResponse.json({ error: 'Failed to delete slide' }, { status: 500 })
  }
}
