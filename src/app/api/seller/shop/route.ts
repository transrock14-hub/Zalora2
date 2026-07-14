import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { ShopStatus } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Please sign in to create a shop' },
        { status: 401 }
      )
    }

    // Anyone signed-in may apply. Admin KYC/shop approval grants canSell afterward.

    // Check they don't already have a shop
    const { data: existingShop } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('userId', currentUser.id)
      .maybeSingle()

    if (existingShop) {
      return NextResponse.json({ error: 'You already have a shop' }, { status: 400 })
    }

    const body = await req.json()
    const {
      name,
      slug,
      description,
      logo,
      banner,
      contactName,
      idNumber,
      inviteCode,
      idCardFront,
      idCardBack,
      mainBusiness,
      detailedAddress,
    } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    if (!contactName || !idNumber) {
      return NextResponse.json(
        { error: 'Contact name and ID number are required for verification' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existing } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    // Create shop
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .insert({
        userId: currentUser.id,
        name,
        slug,
        description: description || null,
        logo: logo || null,
        banner: banner || null,
        status: ShopStatus.PENDING,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Create KYC verification record (PENDING)
    const { error: verificationError } = await supabaseAdmin
      .from('shop_verifications')
      .insert({
        shopId: shop.id,
        userId: currentUser.id,
        contactName: String(contactName).trim(),
        idNumber: String(idNumber).trim(),
        inviteCode: inviteCode ? String(inviteCode).trim() : null,
        idCardFront: idCardFront || null,
        idCardBack: idCardBack || null,
        mainBusiness: mainBusiness ? String(mainBusiness).trim() : null,
        detailedAddress: detailedAddress ? String(detailedAddress).trim() : null,
        status: 'PENDING',
      })

    if (verificationError) {
      await supabaseAdmin.from('shops').delete().eq('id', shop.id)
      throw verificationError
    }

    return NextResponse.json({ shop })
  } catch (error) {
    console.error('Error creating shop:', error)
    return NextResponse.json({ error: 'Failed to create shop' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Please sign in to update your shop' },
        { status: 401 }
      )
    }

    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, name, slug, description, logo, banner, status')
      .eq('userId', currentUser.id)
      .maybeSingle()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Once a shop is approved, the details submitted during the application are
    // locked and can no longer be edited by the seller.
    if (shop.status === ShopStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'Shop details are locked after approval and can no longer be edited.' },
        { status: 403 }
      )
    }
    const body = await req.json()
    const { name, slug, description, logo, banner } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description || null
    if (logo !== undefined) updateData.logo = logo || null
    if (banner !== undefined) updateData.banner = banner || null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // If slug is being updated, check if it's already taken
    if (slug && slug !== shop.slug) {
      const { data: existing } = await supabaseAdmin
        .from('shops')
        .select('id')
        .eq('slug', slug)
        .neq('id', shop.id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
      }
    }

    const { data: updatedShop, error } = await supabaseAdmin
      .from('shops')
      .update(updateData)
      .eq('id', shop.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ shop: updatedShop })
  } catch (error) {
    console.error('Error updating shop:', error)
    return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 })
  }
}
