'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  isVerified: boolean
  createdAt: string
  user: { name: string; email: string }
  product: { name: string; slug: string }
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          icon={star <= rating ? 'solar:star-bold' : 'solar:star-linear'}
          className={`size-4 ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export function ReviewsClient() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/reviews')
      const data = await res.json()
      setReviews(Array.isArray(data.reviews) ? data.reviews : [])
    } catch {
      toast.error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review? Product ratings will be recalculated.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to delete')
      setReviews((prev) => prev.filter((r) => r.id !== id))
      toast.success('Review deleted')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete review')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.product.name.toLowerCase().includes(q) ||
      r.user.name.toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      (r.comment || '').toLowerCase().includes(q) ||
      (r.title || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold font-heading">Product Reviews</h1>
        <p className="text-muted-foreground">Moderate customer reviews across all products</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by product, customer, or comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" onClick={fetchReviews} disabled={loading}>
          <Icon icon="solar:refresh-linear" className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Icon icon="solar:refresh-circle-linear" className="size-10 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {reviews.length === 0 ? 'No reviews yet' : 'No reviews match your search'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={review.rating} />
                      {review.isVerified && (
                        <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                          Verified purchase
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.title && <p className="font-medium">{review.title}</p>}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{review.comment}</p>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">By </span>
                      <span className="font-medium">{review.user.name}</span>
                      <span className="text-muted-foreground"> ({review.user.email})</span>
                    </div>
                    <Link
                      href={`/products/${review.product.slug}`}
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      target="_blank"
                    >
                      {review.product.name}
                      <Icon icon="solar:arrow-right-up-linear" className="size-3.5" />
                    </Link>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === review.id}
                    onClick={() => handleDelete(review.id)}
                  >
                    {deletingId === review.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
