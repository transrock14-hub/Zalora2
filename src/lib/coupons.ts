import { supabaseAdmin } from './supabase'

export interface CouponRecord {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  minPurchase: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
}

export function calculateCouponDiscount(coupon: CouponRecord, subtotal: number): number {
  if (subtotal <= 0) return 0

  let discount = 0
  if (coupon.discountType === 'PERCENTAGE') {
    discount = subtotal * (Number(coupon.discountValue) / 100)
    if (coupon.maxDiscount != null) {
      discount = Math.min(discount, Number(coupon.maxDiscount))
    }
  } else {
    discount = Number(coupon.discountValue)
  }

  return Math.min(Math.max(0, discount), subtotal)
}

export async function validateCouponCode(
  code: string,
  subtotal: number
): Promise<
  | { valid: true; coupon: CouponRecord; discount: number }
  | { valid: false; error: string }
> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) {
    return { valid: false, error: 'Coupon code is required' }
  }

  const { data: coupon, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()

  if (error || !coupon) {
    return { valid: false, error: 'Invalid coupon code' }
  }

  const record = coupon as CouponRecord

  if (!record.isActive) {
    return { valid: false, error: 'This coupon is no longer active' }
  }

  const now = Date.now()
  if (record.startsAt && new Date(record.startsAt).getTime() > now) {
    return { valid: false, error: 'This coupon is not valid yet' }
  }
  if (record.expiresAt && new Date(record.expiresAt).getTime() < now) {
    return { valid: false, error: 'This coupon has expired' }
  }

  if (record.usageLimit != null && record.usedCount >= record.usageLimit) {
    return { valid: false, error: 'This coupon has reached its usage limit' }
  }

  if (record.minPurchase != null && subtotal < Number(record.minPurchase)) {
    return {
      valid: false,
      error: `Minimum purchase of $${Number(record.minPurchase).toFixed(2)} required`,
    }
  }

  const discount = calculateCouponDiscount(record, subtotal)
  if (discount <= 0) {
    return { valid: false, error: 'Coupon does not apply to this order' }
  }

  return { valid: true, coupon: record, discount }
}

export async function incrementCouponUsage(couponId: string): Promise<void> {
  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('usedCount')
    .eq('id', couponId)
    .single()

  if (!coupon) return

  await supabaseAdmin
    .from('coupons')
    .update({
      usedCount: Number(coupon.usedCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', couponId)
}
