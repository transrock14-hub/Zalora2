import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchPrimaryImageMap, mapProductCard } from '@/lib/product-list'
import { ShopDetailsClient } from './shop-details-client'

export const dynamic = 'force-dynamic'

async function getShopBySlug(slug: string) {
  const { data: shopRow, error: shopError } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (shopError || !shopRow) return null

  const shop = {
    id: shopRow.id,
    name: shopRow.name,
    slug: shopRow.slug,
    description: shopRow.description,
    logo: shopRow.logo,
    banner: shopRow.banner,
    rating: shopRow.rating,
    createdAt: shopRow.createdAt,
    followers: shopRow.followers,
    totalSales: shopRow.totalSales,
    memberSince: (shopRow as any).member_since ?? (shopRow as any).memberSince ?? null,
  }

  const { data: productRows, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, price, comparePrice, rating, totalReviews, isFeatured')
    .eq('shopId', shop.id)
    .eq('status', 'PUBLISHED')
    .order('createdAt', { ascending: false })
    .limit(24)

  if (productsError) {
    return { shop, products: [] }
  }

  const productIds = (productRows || []).map((p: any) => p.id)
  const imageMap = await fetchPrimaryImageMap(productIds)

  const products = (productRows || []).map((p: any) =>
    mapProductCard(p, imageMap[p.id] || '/images/logo.png')
  )

  return { shop, products }
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!slug) notFound()

  const data = await getShopBySlug(slug)
  if (!data) notFound()

  return (
    <ShopDetailsClient
      shop={data.shop}
      products={data.products}
    />
  )
}
