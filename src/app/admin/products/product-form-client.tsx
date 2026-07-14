'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  wholesalePrice?: number | null
  salePrice?: number | null
  stock: number
  sku: string | null
  categoryId: string | null
  shopId: string | null
  status: string
  isFeatured: boolean
  rating: number
  totalReviews: number
  images: {
    id: string
    url: string
    alt: string | null
    isPrimary: boolean
    sortOrder: number
  }[]
}

interface Category {
  id: string
  name: string
}

interface Shop {
  id: string
  name: string
}

interface ProductFormClientProps {
  product: Product | null
  categories: Category[]
  shops: Shop[]
}

export function ProductFormClient({ product, categories, shops }: ProductFormClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    price: product?.price || 0,
    comparePrice: product?.comparePrice || 0,
    wholesalePrice: product?.wholesalePrice ?? '',
    salePrice: product?.salePrice ?? product?.price ?? '',
    stock: product?.stock || 0,
    sku: product?.sku || '',
    categoryId: product?.categoryId || '',
    shopId: product?.shopId || '',
    status: product?.status || 'DRAFT',
    isFeatured: product?.isFeatured || false,
    images: product?.images.map(img => img.url) || [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = product
        ? `/api/admin/products/${product.id}`
        : '/api/admin/products'
      
      const method = product ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price.toString()) || 0,
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice.toString()) : null,
          wholesalePrice: formData.wholesalePrice !== '' && formData.wholesalePrice != null ? parseFloat(String(formData.wholesalePrice)) : null,
          salePrice: formData.salePrice !== '' && formData.salePrice != null ? parseFloat(String(formData.salePrice)) : null,
          stock: parseInt(formData.stock.toString()) || 0,
          categoryId: formData.categoryId || null,
          shopId: formData.shopId || null,
          images: formData.images,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product')
      }

      toast.success(product ? 'Product updated!' : 'Product created!')
      router.push('/admin/products')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData({ ...formData, slug })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image file`)
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 5MB)`)
        }

        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('folder', 'products')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`)
        }

        return data.url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }))
      toast.success(`${uploadedUrls.length} image(s) uploaded!`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingImages(false)
      // Reset input
      e.target.value = ''
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= formData.images.length) return

    const newImages = [...formData.images]
    ;[newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]]
    setFormData((prev) => ({ ...prev, images: newImages }))
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            {product ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-muted-foreground">
            {product ? `Editing: ${product.name}` : 'Create a new product'}
          </p>
        </div>
        <Link href="/admin/products">
          <Button variant="outline">
            <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
            Back
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nike Air Max 270"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="nike-air-max-270"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateSlug}>
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the product..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="NIKE-AM270-BLK"
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  placeholder="100"
                  required
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="99.99"
                  required
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="comparePrice">Compare at Price (USD)</Label>
                <Input
                  id="comparePrice"
                  type="number"
                  step="0.01"
                  value={formData.comparePrice}
                  onChange={(e) => setFormData({ ...formData, comparePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="129.99"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Original price to show discount
                </p>
              </div>
            </div>
            {!formData.shopId && (
              <>
                <p className="text-xs text-muted-foreground">
                  For catalog products (No Shop), set Wholesale Price. Sale Price is fixed at wholesale + 20%
                  (what buyers pay / what sellers receive on delivery). Sellers pay wholesale when shipping.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label htmlFor="wholesalePrice">Wholesale Price (USD)</Label>
                    <Input
                      id="wholesalePrice"
                      type="number"
                      step="0.01"
                      value={formData.wholesalePrice}
                      onChange={(e) => {
                        const wholesale =
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        const sale =
                          wholesale === '' || !(Number(wholesale) > 0)
                            ? ''
                            : Math.round(Number(wholesale) * 1.2 * 100) / 100
                        setFormData({
                          ...formData,
                          wholesalePrice: wholesale,
                          salePrice: sale,
                          price: sale === '' ? formData.price : sale,
                        })
                      }}
                      placeholder="Seller cost to process/ship"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      If set, product appears in Wholesale Management.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="salePrice">Sale Price (USD, +20%)</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      value={formData.salePrice}
                      readOnly
                      className="bg-muted"
                      placeholder="Auto: wholesale × 1.20"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Locked at wholesale + 20%.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                >
                  <option value="">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="shopId">Shop (Optional)</Label>
                <select
                  id="shopId"
                  value={formData.shopId}
                  onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
                >
                  <option value="">No Shop (Admin)</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
              />
              <Label htmlFor="isFeatured">Featured Product</Label>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images">Upload Images</Label>
              <div className="mt-2">
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImages}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload one or more images. The first image will be the primary image. Max 5MB per image.
                </p>
              </div>
            </div>

            {/* Image Preview */}
            {formData.images.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border-2 border-border">
                      <Image
                        src={url}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.jpg'
                        }}
                      />
                      {index === 0 && (
                        <Badge className="absolute top-2 left-2">Primary</Badge>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <Icon icon="solar:arrow-up-linear" className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => removeImage(index)}
                          className="h-8 w-8"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => moveImage(index, 'down')}
                          disabled={index === formData.images.length - 1}
                          className="h-8 w-8"
                        >
                          <Icon icon="solar:arrow-down-linear" className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {uploadingImages && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon icon="solar:refresh-bold" className="size-4 animate-spin" />
                    Uploading images...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </Button>
          <Link href="/admin/products" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
