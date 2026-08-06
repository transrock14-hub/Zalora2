import { optimizeProductImageUrl } from '@/lib/cdn-image'
import { supabaseAdmin } from '@/lib/supabase'

/** Columns needed for product cards / grids */
export const PRODUCT_CARD_COLUMNS =
  'id, name, slug, price, comparePrice, salePrice, rating, totalReviews, isFeatured, categoryId, createdAt, wholesalePrice' as const

export type ProductCardRow = {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  salePrice?: number | null
  rating?: number | null
  totalReviews?: number | null
  isFeatured?: boolean | null
  categoryId?: string | null
  wholesalePrice?: number | null
  category?: { name?: string } | null
  images?: { url: string }[] | null
}

export function mapProductCard<T extends Record<string, unknown> = Record<string, never>>(
  p: ProductCardRow,
  imageUrl?: string | null,
  extras?: T
) {
  const rawImage =
    imageUrl ||
    (p.images && p.images.length > 0 ? p.images[0].url : null) ||
    '/images/logo.png'

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
    rating: Number(p.rating || 0),
    reviews: p.totalReviews || 0,
    image: optimizeProductImageUrl(rawImage, 400),
    categoryName: (extras?.categoryName as string | undefined) || p.category?.name || 'Uncategorized',
    isFeatured: !!p.isFeatured,
    ...(extras || ({} as T)),
  }
}

/** Exact published product count for a category (head count). */
export async function countPublishedInCategory(categoryId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', categoryId)
    .eq('status', 'PUBLISHED')

  if (error) {
    console.warn('[product-list] count failed', categoryId, error.message)
    return 0
  }
  return count ?? 0
}

/** Batch primary images for a page of product ids. */
export async function fetchPrimaryImageMap(
  productIds: string[]
): Promise<Record<string, string>> {
  const imageMap: Record<string, string> = {}
  if (productIds.length === 0) return imageMap

  const { data: images } = await supabaseAdmin
    .from('product_images')
    .select('productId, url, isPrimary')
    .in('productId', productIds)
    .order('isPrimary', { ascending: false })

  for (const img of images || []) {
    if (!imageMap[img.productId]) {
      imageMap[img.productId] = optimizeProductImageUrl(img.url, 400)
    }
  }
  return imageMap
}
