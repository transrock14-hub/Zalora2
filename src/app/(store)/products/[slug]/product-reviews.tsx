'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { formatDate } from '@/lib/utils'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  images: string[]
  isVerified: boolean
  createdAt: string
  user: { name: string; avatar: string | null }
}

function Stars({ rating, className = 'size-4' }: { rating: number; className?: string }) {
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Icon
          key={i}
          icon={i < Math.round(rating) ? 'solar:star-bold' : 'solar:star-linear'}
          className={`${className} ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [average, setAverage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        if (Array.isArray(data.reviews)) setReviews(data.reviews)
        if (typeof data.average === 'number') setAverage(data.average)
        if (typeof data.total === 'number') setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [productId])

  return (
    <div className="mt-12 px-4 lg:px-0">
      <h2 className="text-2xl font-bold font-heading mb-6">Customer Reviews</h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-border rounded-xl">
          <Icon icon="solar:star-linear" className="size-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm text-muted-foreground">Be the first to review this product</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{average.toFixed(1)}</div>
              <Stars rating={average} />
              <div className="text-xs text-muted-foreground mt-1">
                {total} review{total > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-border pb-5 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-9 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {review.user.avatar ? (
                      <Image
                        src={review.user.avatar}
                        alt={review.user.name}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon icon="solar:user-bold" className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{review.user.name}</span>
                      {review.isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                          <Icon icon="solar:verified-check-bold" className="size-3.5" />
                          Verified purchase
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                  </div>
                </div>
                <Stars rating={review.rating} />
                {review.title && <p className="font-medium mt-2">{review.title}</p>}
                {review.comment && (
                  <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
