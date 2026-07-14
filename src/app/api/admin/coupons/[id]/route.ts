import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// PUT - Update coupon
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
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      usageLimit,
      startsAt,
      expiresAt,
      isActive,
    } = body

    if (discountType !== undefined && discountType !== 'PERCENTAGE' && discountType !== 'FIXED') {
      return NextResponse.json(
        { message: 'Discount type must be PERCENTAGE or FIXED' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase()
      // Ensure the new code isn't taken by another coupon
      const { data: existing } = await supabaseAdmin
        .from('coupons')
        .select('id')
        .eq('code', normalizedCode)
        .neq('id', params.id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { message: 'A coupon with this code already exists' },
          { status: 409 }
        )
      }
      updateData.code = normalizedCode
    }

    if (description !== undefined) updateData.description = description || null
    if (discountType !== undefined) updateData.discountType = discountType
    if (discountValue !== undefined) updateData.discountValue = Number(discountValue)
    if (minPurchase !== undefined) updateData.minPurchase = minPurchase ? Number(minPurchase) : null
    if (maxDiscount !== undefined) updateData.maxDiscount = maxDiscount ? Number(maxDiscount) : null
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? Number(usageLimit) : null
    if (startsAt !== undefined) updateData.startsAt = startsAt || null
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt || null
    if (isActive !== undefined) updateData.isActive = isActive
    updateData.updatedAt = new Date().toISOString()

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Coupon updated successfully', coupon })
  } catch (error) {
    console.error('Update coupon error:', error)
    return NextResponse.json({ message: 'Failed to update coupon' }, { status: 500 })
  }
}

// DELETE - Delete coupon
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
      .from('coupons')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Coupon deleted successfully' })
  } catch (error) {
    console.error('Delete coupon error:', error)
    return NextResponse.json({ message: 'Failed to delete coupon' }, { status: 500 })
  }
}
