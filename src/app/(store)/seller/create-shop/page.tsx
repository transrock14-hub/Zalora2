import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { CreateShopClient } from './create-shop-client'

export const dynamic = 'force-dynamic'

export default async function CreateShopPage() {
  // Auth is enforced by (store)/seller/layout.tsx; redirect param preserved for post-login return
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  // Check if user already has a shop (any user can apply; no canSell required)
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('shops (*)')
    .eq('id', currentUser.id)
    .single()

  if (user?.shops && Array.isArray(user.shops) && user.shops.length > 0) {
    redirect('/seller/verification-status')
  }

  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('isActive', true)
    .order('name', { ascending: true })

  return <CreateShopClient categories={(categories || []).map((c: any) => ({ id: c.id, name: c.name }))} />
}
