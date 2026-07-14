import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { validateCouponCode } from '@/lib/coupons'

/** POST: validate a coupon code against a cart subtotal. */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Please log in to apply a coupon' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const code = typeof body?.code === 'string' ? body.code : ''
    const subtotal = Number(body?.subtotal)

    if (!code.trim()) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json({ error: 'Invalid order subtotal' }, { status: 400 })
    }

    const result = await validateCouponCode(code, subtotal)
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      code: result.coupon.code,
      couponId: result.coupon.id,
      discount: result.discount,
      discountType: result.coupon.discountType,
      description: result.coupon.description ?? null,
    })
  } catch (e) {
    console.error('POST /api/coupons/validate', e)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
