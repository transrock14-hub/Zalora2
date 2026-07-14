import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { revalidateStorefront } from '@/lib/revalidate'

export async function POST(req: NextRequest) {
  try {
    const auth = await getSession()

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      slug,
      description,
      price,
      comparePrice,
      wholesalePrice,
      salePrice,
      stock,
      sku,
      categoryId,
      shopId,
      status,
      isFeatured,
      images,
    } = body

    if (!name || !slug || price === undefined) {
      return NextResponse.json(
        { error: 'Name, slug, and price are required' },
        { status: 400 }
      )
    }

    if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    // Create product
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        name,
        slug,
        description: description || null,
        price,
        comparePrice: comparePrice || null,
        wholesalePrice: wholesalePrice != null && wholesalePrice !== '' ? wholesalePrice : null,
        salePrice: salePrice != null && salePrice !== '' ? salePrice : null,
        stock: stock || 0,
        sku: sku || null,
        categoryId: categoryId.trim(),
        shopId: shopId || null,
        status: status || 'DRAFT',
        isFeatured: isFeatured || false,
      })
      .select()
      .single()

    if (productError || !product) {
      throw productError || new Error('Failed to create product')
    }

    // Create images
    if (images && Array.isArray(images) && images.length > 0) {
      const imageInserts = images.map((url: string, index: number) => ({
        productId: product.id,
        url,
        alt: name,
        isPrimary: index === 0,
        sortOrder: index,
      }))

      await supabaseAdmin
        .from('product_images')
        .insert(imageInserts)
    }

    revalidateStorefront(['home', 'products'])
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
