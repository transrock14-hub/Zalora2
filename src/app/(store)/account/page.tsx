import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { AccountClient } from './account-client'

export const dynamic = 'force-dynamic'

async function getAccountData(userId: string) {
  const [ordersCount, favoritesCount, userResult, settingResult] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('userId', userId),
    supabaseAdmin.from('favorites').select('*', { count: 'exact', head: true }).eq('userId', userId),
    supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        avatar,
        balance,
        role,
        canSell,
        shops (
          id,
          name,
          status
        )
      `)
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'user_selling_enabled')
      .single(),
  ])

  const user = userResult.data
  const userSellingEnabled = settingResult.data?.value === 'true'
  const rawShops = user?.shops
  type ShopRow = { id: string; name?: string | null; status?: string | null }
  const shopRow: ShopRow | null =
    Array.isArray(rawShops) && rawShops.length > 0
      ? (rawShops[0] as ShopRow)
      : rawShops && typeof rawShops === 'object' && rawShops !== null && !Array.isArray(rawShops) && 'id' in rawShops
        ? (rawShops as ShopRow)
        : null
  const shop = shopRow
    ? { id: shopRow.id, name: shopRow.name ?? '', status: shopRow.status || 'PENDING' }
    : null
  const shopId = shop?.id

  // Store Orders badge: only count NEW pending orders that need the seller's
  // action (paid, not yet processed). Once processed/shipped/etc. it drops off.
  let sellerOrdersCount = 0
  if (shopId) {
    const { count } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('shopId', shopId)
      .eq('status', 'PAID')
    sellerOrdersCount = count ?? 0
  }

  return {
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          balance: Number(user.balance || 0),
          role: user.role,
          canSell: user.canSell && userSellingEnabled,
          shop,
        }
      : null,
    stats: {
      orders: ordersCount?.count ?? 0,
      favorites: favoritesCount?.count ?? 0,
      sellerOrdersCount: sellerOrdersCount ?? 0,
    },
  }
}

export default async function AccountPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const data = await getAccountData(currentUser.id)
  if (!data.user) return null

  return <AccountClient user={data.user} stats={data.stats} />
}
