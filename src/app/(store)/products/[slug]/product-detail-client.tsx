'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductCard } from '@/components/product-card'
import { ProductReviews } from './product-reviews'
import { useCartStore, useUserStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  stock: number
  sku: string | null
  rating: number
  totalReviews: number
  isFeatured: boolean
  images: {
    url: string
    alt: string | null
  }[]
  category: {
    id: string
    name: string
    slug: string
  } | null
  shop: {
    id: string
    name: string
    slug: string
  } | null
}

interface RelatedProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  rating: number
  reviews: number
  image: string
  isFeatured: boolean
}

export function ProductDetailClient({
  product,
  relatedProducts,
}: {
  product: Product
  relatedProducts: RelatedProduct[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useUserStore((state) => state.user)
  const addItem = useCartStore((state) => state.addItem)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [inCollection, setInCollection] = useState<boolean | null>(null)
  const [collectionLoading, setCollectionLoading] = useState(false)

  useEffect(() => {
    if (!user || !product.id) {
      setInCollection(null)
      return
    }
    fetch(`/api/favorites/check?productId=${encodeURIComponent(product.id)}`)
      .then((res) => res.json())
      .then((data) => setInCollection(!!data.inCollection))
      .catch(() => setInCollection(false))
  }, [user, product.id])

  const handleToggleCollection = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname || `/products/${product.slug}`)}`)
      return
    }
    setCollectionLoading(true)
    try {
      if (inCollection) {
        const res = await fetch(`/api/favorites?productId=${encodeURIComponent(product.id)}`, { method: 'DELETE' })
        const data = await res.json()
        if (res.ok) {
          setInCollection(false)
          toast.success('Removed from collection')
        } else {
          toast.error(data.message || 'Failed to remove')
        }
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id }),
        })
        const data = await res.json()
        if (res.ok) {
          setInCollection(true)
          toast.success('Added to collection')
        } else {
          toast.error(data.message || 'Failed to add')
        }
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setCollectionLoading(false)
    }
  }

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]?.url || '/placeholder-product.jpg',
      quantity,
      shopId: product.shop?.id,
      shopName: product.shop?.name,
    })
    toast.success('Added to cart!')
  }

  const handleBuyNow = () => {
    handleAddToCart()
    router.push('/cart')
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-card px-4 shadow-sm lg:hidden border-b border-border">
        <button onClick={() => router.back()} className="text-foreground">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </button>
        <h1 className="text-sm font-semibold text-foreground font-heading truncate flex-1 mx-4">
          Product Details
        </h1>
        <Link href="/cart" className="text-foreground">
          <Icon icon="solar:cart-large-linear" className="size-6" />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-0 lg:px-4 py-0 lg:py-6">
          {/* Breadcrumb - Desktop */}
          <nav className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <Icon icon="solar:arrow-right-linear" className="size-4" />
            {product.category && (
              <>
                <Link href={`/categories/${product.category.slug}`} className="hover:text-foreground">
                  {product.category.name}
                </Link>
                <Icon icon="solar:arrow-right-linear" className="size-4" />
              </>
            )}
            <span className="text-foreground">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square relative bg-muted rounded-lg lg:rounded-xl overflow-hidden">
                <Image
                  src={product.images[selectedImage]?.url || '/placeholder-product.jpg'}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                  unoptimized={/^https?:\/\//i.test(product.images[selectedImage]?.url || '')}
                />
                {discount > 0 && (
                  <Badge variant="destructive" className="absolute top-4 left-4">
                    -{discount}%
                  </Badge>
                )}
                {product.isFeatured && (
                  <Badge className="absolute top-4 right-4">
                    <Icon icon="solar:star-bold" className="size-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

              {/* Thumbnail Images */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2 px-4 lg:px-0">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square relative bg-muted rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={image.url}
                        alt={image.alt || product.name}
                        fill
                        className="object-cover"
                        unoptimized={/^https?:\/\//i.test(image.url)}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4 px-4 lg:px-0">
              {/* Title */}
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold font-heading mb-2">
                  {product.name}
                </h1>
                {product.category && (
                  <Link
                    href={`/categories/${product.category.slug}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {product.category.name}
                  </Link>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      icon="solar:star-bold"
                      className={`size-5 ${
                        i < Math.floor(product.rating) ? 'text-amber-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({product.totalReviews} reviews)</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.comparePrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.comparePrice)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.stock > 0 ? (
                  <>
                    <Icon icon="solar:check-circle-bold" className="size-5 text-green-500" />
                    <span className="text-sm">
                      In Stock ({product.stock} available)
                    </span>
                  </>
                ) : (
                  <>
                    <Icon icon="solar:close-circle-bold" className="size-5 text-red-500" />
                    <span className="text-sm text-red-500">Out of Stock</span>
                  </>
                )}
              </div>

              {/* SKU */}
              {product.sku && (
                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
              )}

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description:</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Quantity Selector */}
              {product.stock > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity:</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="size-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Icon icon="solar:minus-linear" className="size-5" />
                    </button>
                    <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="size-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                    >
                      <Icon icon="solar:add-linear" className="size-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  className="flex-1 min-w-[120px]"
                  disabled={product.stock === 0}
                >
                  <Icon icon="solar:cart-plus-bold" className="mr-2 size-5" />
                  Add to Cart
                </Button>
                <Button
                  onClick={handleBuyNow}
                  className="flex-1 min-w-[120px]"
                  disabled={product.stock === 0}
                >
                  Buy Now
                </Button>
                <Button
                  variant={inCollection ? 'secondary' : 'outline'}
                  size="icon"
                  className="shrink-0"
                  onClick={handleToggleCollection}
                  disabled={collectionLoading}
                  title={inCollection ? 'In collection (click to remove)' : 'Add to collection'}
                >
                  {collectionLoading ? (
                    <Icon icon="solar:refresh-circle-linear" className="size-5 animate-spin" />
                  ) : inCollection ? (
                    <Icon icon="solar:heart-bold" className="size-5 text-primary" />
                  ) : (
                    <Icon icon="solar:heart-linear" className="size-5" />
                  )}
                </Button>
              </div>
              {user && inCollection !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {inCollection ? 'In My Collection' : 'Add to My Collection'}
                </p>
              )}

              {/* Shop Info */}
              {product.shop && (
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon="solar:shop-bold" className="size-5 text-primary" />
                    <span className="font-medium">Sold by:</span>
                  </div>
                  <Link
                    href={`/shops/${product.shop.slug}`}
                    className="text-primary hover:underline"
                  >
                    {product.shop.name}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          <ProductReviews productId={product.id} />

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-12 px-4 lg:px-0">
              <h2 className="text-2xl font-bold font-heading mb-6">You May Also Like</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
