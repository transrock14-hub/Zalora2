import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET all coupons
export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { data: coupons, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ coupons: coupons || [] })
  } catch (error) {
    console.error('Fetch coupons error:', error)
    return NextResponse.json({ message: 'Failed to fetch coupons' }, { status: 500 })
  }
}

// POST - Create new coupon
export async function POST(request: NextRequest) {
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

    if (!code || !discountType || discountValue === undefined || discountValue === null) {
      return NextResponse.json(
        { message: 'Code, discount type, and discount value are required' },
        { status: 400 }
      )
    }

    if (discountType !== 'PERCENTAGE' && discountType !== 'FIXED') {
      return NextResponse.json(
        { message: 'Discount type must be PERCENTAGE or FIXED' },
        { status: 400 }
      )
    }

    const normalizedCode = String(code).trim().toUpperCase()

    // Ensure unique code
    const { data: existing } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .eq('code', normalizedCode)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { message: 'A coupon with this code already exists' },
        { status: 409 }
      )
    }

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: normalizedCode,
        description: description || null,
        discountType,
        discountValue: Number(discountValue),
        minPurchase: minPurchase ? Number(minPurchase) : null,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        startsAt: startsAt || null,
        expiresAt: expiresAt || null,
        isActive: isActive !== undefined ? isActive : true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Coupon created successfully', coupon })
  } catch (error) {
    console.error('Create coupon error:', error)
    return NextResponse.json({ message: 'Failed to create coupon' }, { status: 500 })
  }
}
