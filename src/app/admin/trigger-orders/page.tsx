import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { TriggerOrdersClient } from './trigger-orders-client'

export const dynamic = 'force-dynamic'

interface SearchParams {
  page?: string
  shop?: string
}

async function getTriggerOrdersData(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 24
  const skip = (page - 1) * limit

  let productsQuery = supabaseAdmin
    .from('products')
    .select(`
      id,
      name,
      price,
      slug,
      shopId,
      category:categories!products_categoryId_fkey ( name ),
      shop:shops!products_shopId_fkey ( id, name ),
      images:product_images ( url, isPrimary )
    `, { count: 'exact' })
    .not('shopId', 'is', null)

  if (searchParams.shop) {
    productsQuery = productsQuery.eq('shopId', searchParams.shop)
  }

  productsQuery = productsQuery.order('createdAt', { ascending: false }).range(skip, skip + limit - 1)

  const [productsResult, shopsResult, customersResult] = await Promise.all([
    productsQuery,
    supabaseAdmin
      .from('shops')
      .select('id, name')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('users')
      .select('id, name, email, role')
      .neq('role', 'ADMIN')
      .neq('role', 'MANAGER')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true })
      .limit(500),
  ])

  if (productsResult.error) throw productsResult.error

  const total = productsResult.count || 0
  const products = (productsResult.data || []).map((p: any) => {
    const images = p.images || []
    const primary = images.find((i: any) => i.isPrimary) || images[0]
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      slug: p.slug,
      shopId: p.shopId,
      shopName: p.shop?.name || null,
      categoryName: p.category?.name || 'Uncategorized',
      image: primary?.url || null,
    }
  })
  const shops = (shopsResult.data || []).map((s: any) => ({ id: s.id, name: s.name }))
  const customers = (customersResult.data || []).map((u: any) => ({
    id: u.id as string,
    name: (u.name as string) || 'Customer',
    email: (u.email as string) || '',
  }))

  return {
    products,
    total,
    pages: Math.ceil(total / limit),
    page,
    shops,
    customers,
  }
}

export default async function TriggerOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return null
  }

  const data = await getTriggerOrdersData(searchParams)
  return <TriggerOrdersClient {...data} searchParams={searchParams} />
}
