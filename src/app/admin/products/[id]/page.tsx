import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { ProductFormClient } from '../product-form-client'

export const dynamic = 'force-dynamic'

async function getProduct(id: string) {
  if (id === 'new') {
    return null
  }

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      images:product_images (*)
    `)
    .eq('id', id)
    .single()

  if (error || !product) {
    return null
  }

  // Sort images by sortOrder
  const sortedImages = (product.images || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder)

  return {
    ...product,
    images: sortedImages,
  }
}

async function getFormData() {
  const [categoriesResult, shopsResult] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('*')
      .eq('isActive', true)
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('shops')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true }),
  ])

  return {
    categories: categoriesResult.data || [],
    shops: shopsResult.data || [],
  }
}

export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const [product, { categories, shops }] = await Promise.all([
    getProduct(params.id),
    getFormData(),
  ])

  if (params.id !== 'new' && !product) {
    notFound()
  }

  return (
    <ProductFormClient
      product={
        product
          ? {
              ...product,
              price: Number(product.price),
              comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
              rating: Number(product.rating || 0),
            }
          : null
      }
      categories={categories}
      shops={shops}
    />
  )
}
