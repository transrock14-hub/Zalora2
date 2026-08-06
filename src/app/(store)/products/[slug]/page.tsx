import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { optimizeProductImageUrl } from '@/lib/cdn-image'
import { mapProductCard, PRODUCT_CARD_COLUMNS } from '@/lib/product-list'
import { ProductDetailClient } from './product-detail-client'

export const revalidate = 300

async function getProductUncached(slug: string) {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, slug, description, shortDesc, price, comparePrice, salePrice,
      wholesalePrice, stock, sku, rating, totalReviews, isFeatured, isPromoted,
      categoryId, shopId, status, createdAt,
      images:product_images (id, url, alt, sortOrder, isPrimary),
      category:categories!products_categoryId_fkey (id, name, slug),
      shop:shops!products_shopId_fkey (
        id,
        name,
        slug
      )
    `)
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .single()

  if (error || !product) {
    return null
  }

  const sortedImages = (product.images || [])
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .map((img: any) => ({
      ...img,
      url: optimizeProductImageUrl(img.url, 800),
    }))

  const { data: relatedProducts } = await supabaseAdmin
    .from('products')
    .select(
      `
      ${PRODUCT_CARD_COLUMNS},
      images:product_images!inner (
        url
      )
    `
    )
    .eq('categoryId', product.categoryId)
    .eq('status', 'PUBLISHED')
    .neq('id', product.id)
    .eq('images.isPrimary', true)
    .limit(4)

  const category = Array.isArray(product.category) ? product.category[0] : product.category
  const shop = Array.isArray(product.shop) ? product.shop[0] : product.shop

  return {
    product: {
      ...product,
      category: category || null,
      shop: shop || null,
      images: sortedImages,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      rating: Number(product.rating || 0),
    },
    relatedProducts: (relatedProducts || []).map((p: any) =>
      mapProductCard(p, p.images?.[0]?.url)
    ),
  }
}

async function getProduct(slug: string) {
  const cached = unstable_cache(
    () => getProductUncached(slug),
    ['product-detail', slug],
    { revalidate: 300, tags: ['products'] }
  )
  return cached()
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const data = await getProduct(params.slug)

  if (!data) {
    notFound()
  }

  return <ProductDetailClient product={data.product} relatedProducts={data.relatedProducts} />
}
