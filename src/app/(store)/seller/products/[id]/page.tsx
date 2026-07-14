import { redirect } from 'next/navigation'
import { getCurrentUser, getSellerShopAccess } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SellerProductFormClient } from '../product-form-client'
import { SellerAddFromCatalogClient } from '../add-from-catalog-client'

export const dynamic = 'force-dynamic'

async function getProduct(id: string, shopId: string) {
  if (id === 'new') {
    return null
  }

  // Get product and verify it belongs to this shop
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      images:product_images (*)
    `)
    .eq('id', id)
    .eq('shopId', shopId)
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
  const { data: categories, error } = await supabaseAdmin
    .from('categories')
    .select('id, name, icon')
    .eq('isActive', true)
    .order('name', { ascending: true })

  if (error) {
    return { categories: [] }
  }

  return {
    categories: (categories || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || 'solar:box-linear',
    })),
  }
}

/** Main shop products (shopId is null) for sellers to add to their store */
async function getMainShopProducts(categoryId: string | null) {
  let query = supabaseAdmin
    .from('products')
    .select(`
      id,
      name,
      slug,
      price,
      status,
      categoryId,
      category:categories!products_categoryId_fkey ( name )
    `)
    .is('shopId', null)
    .in('status', ['PUBLISHED', 'DRAFT'])
    .order('name', { ascending: true })
    .limit(100)

  if (categoryId) {
    query = query.eq('categoryId', categoryId)
  }

  const { data: rows, error } = await query
  if (error) return { products: [], categories: [] }

  const productIds = (rows || []).map((p: any) => p.id)
  let imageMap: Record<string, string> = {}
  if (productIds.length > 0) {
    const { data: images } = await supabaseAdmin
      .from('product_images')
      .select('productId, url')
      .in('productId', productIds)
      .eq('isPrimary', true)
    ;(images || []).forEach((img: any) => {
      imageMap[img.productId] = img.url
    })
  }

  const products = (rows || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    image: imageMap[p.id] || null,
    categoryName: p.category?.name || 'Uncategorized',
    status: p.status,
  }))

  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('isActive', true)
    .order('name', { ascending: true })

  return {
    products,
    categories: (categories || []).map((c: any) => ({ id: c.id, name: c.name })),
  }
}

export default async function SellerProductPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { category?: string }
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser) return null

  const { shop } = await getSellerShopAccess(currentUser.id)
  if (!shop) redirect('/seller/create-shop')

  const isNew = params.id === 'new'

  if (isNew) {
    const { data: settingRow } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'levels_can_upload_own_products')
      .maybeSingle()

    const levelsStr = (settingRow?.value as string) || ''
    const allowedLevels = levelsStr.split(',').map((s: string) => s.trim()).filter(Boolean)
    const shopLevel = (shop as { level?: string }).level ?? 'BRONZE'
    const canUploadOwn = allowedLevels.length > 0 && allowedLevels.includes(shopLevel)

    if (!canUploadOwn) {
      const categoryId = searchParams?.category || null
      const { products, categories } = await getMainShopProducts(categoryId)
      return (
        <SellerAddFromCatalogClient
          products={products}
          categories={categories}
          selectedCategoryId={categoryId}
        />
      )
    }
  }

  const [product, formData] = await Promise.all([
    getProduct(params.id, shop.id),
    getFormData(),
  ])

  // If editing and product not found, redirect
  if (params.id !== 'new' && !product) {
    redirect('/seller/products')
  }

  // Convert Decimal fields to numbers for client component
  const productData = product
    ? {
        ...product,
        price: Number(product.price),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
        costPrice: product.costPrice ? Number(product.costPrice) : null,
      }
    : null

  return <SellerProductFormClient product={productData} categories={formData.categories} />
}
