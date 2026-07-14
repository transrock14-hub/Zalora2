import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { ProductDetailClient } from './product-detail-client'

// Revalidate every 5 minutes
export const revalidate = 300

async function getProduct(slug: string) {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      images:product_images (*),
      category:categories (*),
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

  // Sort images by sortOrder
  const sortedImages = (product.images || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder)

  // Get related products from same category
  const { data: relatedProducts } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      images:product_images!inner (
        url
      )
    `)
    .eq('categoryId', product.categoryId)
    .eq('status', 'PUBLISHED')
    .neq('id', product.id)
    .eq('images.isPrimary', true)
    .limit(4)

  return {
    product: {
      ...product,
      images: sortedImages,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      rating: Number(product.rating || 0),
    },
    relatedProducts: (relatedProducts || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      rating: Number(p.rating || 0),
      reviews: p.totalReviews || 0,
      image: p.images && p.images.length > 0 ? p.images[0].url : '/placeholder-product.jpg',
      isFeatured: p.isFeatured,
    })),
  }
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
