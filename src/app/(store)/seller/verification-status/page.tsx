import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { VerificationStatusClient } from './verification-status-client'

export const dynamic = 'force-dynamic'

async function getVerificationData(userId: string) {
  const { data: verification } = await supabaseAdmin
    .from('shop_verifications')
    .select('id, shopId, status, rejectionReason, reviewedAt, createdAt')
    .eq('userId', userId)
    .maybeSingle()

  if (!verification) {
    return { verification: null, shop: null }
  }

  let shop = null
  if (verification.shopId) {
    const { data: shopData } = await supabaseAdmin
      .from('shops')
      .select('id, name, slug, status')
      .eq('id', verification.shopId)
      .single()
    shop = shopData
  }

  return {
    verification: {
      id: verification.id,
      shopId: verification.shopId,
      status: verification.status,
      rejectionReason: verification.rejectionReason,
      reviewedAt: verification.reviewedAt,
      createdAt: verification.createdAt,
    },
    shop,
  }
}

export default async function VerificationStatusPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const data = await getVerificationData(currentUser.id)
  return <VerificationStatusClient {...data} />
}
