import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with shop
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('shops (*)')
      .eq('id', session.userId)
      .single()

    if (!user?.shops || !Array.isArray(user.shops) || user.shops.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shop = user.shops[0]

    // Get product with images and category
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        images:product_images (*),
        category:categories (*)
      `)
      .eq('id', params.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Verify product belongs to user's shop
    if (product.shopId !== shop.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Sort images by sortOrder
    const sortedImages = (product.images || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder)

    return NextResponse.json({
      product: {
        ...product,
        images: sortedImages,
      },
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with shop
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('shops (*)')
      .eq('id', session.userId)
      .single()

    if (!user?.shops || !Array.isArray(user.shops) || user.shops.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shop = user.shops[0]

    // Verify product belongs to user's shop
    const { data: existingProduct, error: existingError } = await supabaseAdmin
      .from('products')
      .select('shopId, slug')
      .eq('id', params.id)
      .single()

    if (existingError || !existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (existingProduct.shopId !== shop.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      slug,
      description,
      price,
      comparePrice,
      stock,
      sku,
      categoryId,
      status,
      images,
    } = body

    // If slug is being updated, check if it's already taken
    if (slug && slug !== existingProduct.slug) {
      const { data: slugExists } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('slug', slug)
        .neq('id', params.id)
        .single()

      if (slugExists) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
      }
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (comparePrice !== undefined) updateData.comparePrice = comparePrice
    if (stock !== undefined) updateData.stock = stock
    if (sku !== undefined) updateData.sku = sku
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (status !== undefined) updateData.status = status

    // Update product
    const { data: product, error: updateError } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update images if provided
    if (images && Array.isArray(images)) {
      // Delete existing images
      await supabaseAdmin
        .from('product_images')
        .delete()
        .eq('productId', params.id)

      // Create new images
      if (images.length > 0) {
        const imageInserts = images.map((url: string, index: number) => ({
          productId: params.id,
          url,
          alt: name || product?.name || 'Product image',
          isPrimary: index === 0,
          sortOrder: index,
        }))

        await supabaseAdmin
          .from('product_images')
          .insert(imageInserts)
      }
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with shop
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('shops (*)')
      .eq('id', session.userId)
      .single()

    if (!user?.shops || !Array.isArray(user.shops) || user.shops.length === 0) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shop = user.shops[0]

    // Verify product belongs to user's shop
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('shopId')
      .eq('id', params.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.shopId !== shop.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete product images first
    await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('productId', params.id)

    // Delete product
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
