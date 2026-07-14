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

    const { data: slides, error } = await supabaseAdmin
      .from('hero_slides')
      .select('*')
      .order('sortOrder', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ slides })
  } catch (error) {
    console.error('Error fetching hero slides:', error)
    return NextResponse.json({ error: 'Failed to fetch slides' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getSession()

    if (!auth) {
      console.error('[Hero Slides POST] No auth session found')
      return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 })
    }

    if (auth.role !== 'ADMIN' && auth.role !== 'MANAGER') {
      console.error(`[Hero Slides POST] Insufficient permissions. Role: ${auth.role}, User: ${auth.email}`)
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

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    const { data: slide, error } = await supabaseAdmin
      .from('hero_slides')
      .insert({
        title: title || null,
        subtitle: subtitle || null,
        image,
        mobileImage: mobileImage || null,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? sortOrder : 0,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidateStorefront(['home', 'hero_slides'])
    return NextResponse.json({ slide })
  } catch (error) {
    console.error('Error creating hero slide:', error)
    return NextResponse.json({ error: 'Failed to create slide' }, { status: 500 })
  }
}
