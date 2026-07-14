import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { revalidateStorefront } from '@/lib/revalidate'
import { normalizeWholesalePair } from '@/lib/wholesale-pricing'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // If slug is being updated, check if it's already taken
    if (slug) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('slug', slug)
        .neq('id', params.id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
      }
    }

    // Get current product for alt text + wholesale normalization
    const { data: currentProduct } = await supabaseAdmin
      .from('products')
      .select('name, shopId, wholesalePrice, salePrice, price')
      .eq('id', params.id)
      .single()

    // Build update data object
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description || null
    if (price !== undefined) updateData.price = price
    if (comparePrice !== undefined) updateData.comparePrice = comparePrice || null
    if (stock !== undefined) updateData.stock = stock
    if (sku !== undefined) updateData.sku = sku || null
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (shopId !== undefined) updateData.shopId = shopId || null
    if (status !== undefined) updateData.status = status
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (wholesalePrice !== undefined) updateData.wholesalePrice = wholesalePrice != null && wholesalePrice !== '' ? wholesalePrice : null
    if (salePrice !== undefined) updateData.salePrice = salePrice != null && salePrice !== '' ? salePrice : null

    const effectiveShopId = shopId !== undefined ? shopId || null : currentProduct?.shopId
    if (!effectiveShopId) {
      const pair = normalizeWholesalePair({
        wholesalePrice:
          wholesalePrice !== undefined
            ? wholesalePrice != null && wholesalePrice !== ''
              ? Number(wholesalePrice)
              : null
            : currentProduct?.wholesalePrice != null
              ? Number(currentProduct.wholesalePrice)
              : null,
        salePrice:
          salePrice !== undefined
            ? salePrice != null && salePrice !== ''
              ? Number(salePrice)
              : null
            : currentProduct?.salePrice != null
              ? Number(currentProduct.salePrice)
              : null,
        price:
          price !== undefined
            ? Number(price)
            : currentProduct?.price != null
              ? Number(currentProduct.price)
              : null,
      })
      if (pair) {
        updateData.wholesalePrice = pair.wholesalePrice
        updateData.salePrice = pair.salePrice
        updateData.price = pair.salePrice
      }
    }

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
          alt: name || currentProduct?.name || 'Product image',
          isPrimary: index === 0,
          sortOrder: index,
        }))

        await supabaseAdmin
          .from('product_images')
          .insert(imageInserts)
      }
    }

    revalidateStorefront(['home', 'products'])
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
    const auth = await getSession()

    if (!auth || (auth.role !== 'ADMIN' && auth.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete product images first
    await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('productId', params.id)

    // Delete the product
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    revalidateStorefront(['home', 'products'])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
