import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { FavoritesClient } from './favorites-client'

async function getUserFavorites(userId: string) {
  const { data: favorites, error } = await supabaseAdmin
    .from('favorites')
    .select(`
      userId,
      productId,
      product:products!favorites_productId_fkey (
        id,
        name,
        slug,
        price,
        comparePrice,
        rating,
        totalReviews,
        isFeatured
      )
    `)
    .eq('userId', userId)
    .order('createdAt', { ascending: false })

  if (error) {
    throw error
  }

  const productIds = (favorites || []).map((fav: any) => fav.product?.id).filter(Boolean)
  let imageMap: Record<string, string> = {}
  if (productIds.length > 0) {
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('productId, url, isPrimary')
      .in('productId', productIds)
      .order('isPrimary', { ascending: false })
    const byProduct = (images || []).reduce((acc: Record<string, string>, img: any) => {
      if (!acc[img.productId]) acc[img.productId] = img.url
      return acc
    }, {})
    imageMap = byProduct
  }

  return (favorites || []).map((fav: any) => ({
    userId: fav.userId,
    productId: fav.productId,
    product: {
      id: fav.product?.id,
      name: fav.product?.name,
      slug: fav.product?.slug,
      price: Number(fav.product?.price ?? 0),
      comparePrice: fav.product?.comparePrice ? Number(fav.product.comparePrice) : null,
      rating: Number(fav.product?.rating ?? 0),
      reviews: fav.product?.totalReviews ?? 0,
      image: imageMap[fav.productId] || '/images/logo.png',
      isFeatured: fav.product?.isFeatured ?? false,
    },
  }))
}

export default async function FavoritesPage() {
  const user = await getCurrentUser()

  if (!user) return null

  const favorites = await getUserFavorites(user.id)

  return <FavoritesClient favorites={favorites} />
}
