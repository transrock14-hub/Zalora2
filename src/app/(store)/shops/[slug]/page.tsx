import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
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
  let imageMap: Record<string, string> = {}
  if (productIds.length > 0) {
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('productId, url, isPrimary')
      .in('productId', productIds)
      .order('isPrimary', { ascending: false })
    const byProduct = (images || []).reduce(
      (acc: Record<string, string>, img: any) => {
        if (!acc[img.productId]) acc[img.productId] = img.url
        return acc
      },
      {}
    )
    imageMap = byProduct
  }

  const products = (productRows || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    rating: Number(p.rating || 0),
    reviews: Number(p.totalReviews || 0),
    image: imageMap[p.id] || '/images/logo.png',
    isFeatured: p.isFeatured,
  }))

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
