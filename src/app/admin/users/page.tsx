import { supabaseAdmin } from '@/lib/supabase'
import { UsersClient } from './users-client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  search?: string
  role?: string
  status?: string
}

async function getUsers(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  // Query users only (no join) so the list never fails and new users always show
  const userColumns = 'id, email, name, avatar, role, status, balance, canSell, lastLoginAt, lastLoginIp, createdAt'
  let usersQuery = supabaseAdmin
    .from('users')
    .select(userColumns, { count: 'exact' })

  if (searchParams.search) {
    usersQuery = usersQuery.or(`name.ilike.%${searchParams.search}%,email.ilike.%${searchParams.search}%`)
  }
  if (searchParams.role) {
    usersQuery = usersQuery.eq('role', searchParams.role)
  }
  if (searchParams.status) {
    usersQuery = usersQuery.eq('status', searchParams.status)
  }

  usersQuery = usersQuery
    .order('createdAt', { ascending: false })
    .range(skip, skip + limit - 1)

  const { data: users, count: total, error } = await usersQuery

  if (error) {
    console.error('[ADMIN USERS] Query error:', error)
    throw error
  }

  const userIds = (users || []).map((u: { id: string }) => u.id)
  const shopByUserId: Record<string, { id: string; name: string; status: string }> = {}
  if (userIds.length > 0) {
    const { data: shops } = await supabaseAdmin
      .from('shops')
      .select('id, name, status, userId')
      .in('userId', userIds)
    if (shops) {
      for (const s of shops) {
        const uid = (s as { userId?: string }).userId
        if (uid && !shopByUserId[uid]) shopByUserId[uid] = { id: s.id, name: s.name, status: s.status }
      }
    }
  }

  return {
    users: (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      status: u.status,
      balance: Number(u.balance || 0),
      canSell: u.canSell,
      lastLoginAt: u.lastLoginAt || null,
      shop: shopByUserId[u.id] ?? null,
    })),
    total: total ?? 0,
    pages: Math.ceil((total ?? 0) / limit),
    page,
  }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const data = await getUsers(searchParams)
  return <UsersClient {...data} searchParams={searchParams} />
}
