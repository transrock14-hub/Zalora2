'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import toast from 'react-hot-toast'

interface ReviewProduct {
  id: string
  name: string
  slug: string
  image: string
}

interface ExistingReview {
  rating: number
  title: string | null
  comment: string | null
}

interface DraftState {
  rating: number
  title: string
  comment: string
  submitting: boolean
  done: boolean
}

export function ReviewClient({
  orderId,
  orderNumber,
  products,
  existing,
}: {
  orderId: string
  orderNumber: string
  products: ReviewProduct[]
  existing: Record<string, ExistingReview>
}) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => {
    const initial: Record<string, DraftState> = {}
    for (const p of products) {
      const e = existing[p.id]
      initial[p.id] = {
        rating: e?.rating ?? 0,
        title: e?.title ?? '',
        comment: e?.comment ?? '',
        submitting: false,
        done: !!e,
      }
    }
    return initial
  })

  const setDraft = (productId: string, patch: Partial<DraftState>) => {
    setDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }))
  }

  const submit = async (product: ReviewProduct) => {
    const draft = drafts[product.id]
    if (!draft.rating) {
      toast.error('Please select a star rating')
      return
    }
    setDraft(product.id, { submitting: true })
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: draft.rating,
          title: draft.title || null,
          comment: draft.comment || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to submit review')
      setDraft(product.id, { done: true })
      toast.success(data.updated ? 'Review updated' : 'Review submitted. Thank you!')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit review')
    } finally {
      setDraft(product.id, { submitting: false })
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href={`/account/orders/${orderId}`} className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Write a Review
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="hidden lg:flex items-center gap-2 mb-6">
            <Link href={`/account/orders/${orderId}`} className="text-muted-foreground hover:text-foreground">
              <Icon icon="solar:arrow-left-linear" className="size-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-heading">Write a Review</h1>
              <p className="text-muted-foreground">Order #{orderNumber}</p>
            </div>
          </div>

          <div className="space-y-4">
            {products.map((product) => {
              const draft = drafts[product.id]
              return (
                <Card key={product.id}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="size-16 rounded bg-muted overflow-hidden shrink-0">
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/products/${product.slug}`}
                          className="font-medium hover:text-primary line-clamp-2"
                        >
                          {product.name}
                        </Link>
                        {draft.done && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                            <Icon icon="solar:check-circle-bold" className="size-4" />
                            Reviewed
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-1 block">Your rating</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setDraft(product.id, { rating: star })}
                            className="p-0.5"
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Icon
                              icon={star <= draft.rating ? 'solar:star-bold' : 'solar:star-linear'}
                              className={`size-7 ${star <= draft.rating ? 'text-amber-400' : 'text-gray-300'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`title-${product.id}`}>Title (optional)</Label>
                      <Input
                        id={`title-${product.id}`}
                        value={draft.title}
                        maxLength={120}
                        placeholder="Sum up your experience"
                        onChange={(e) => setDraft(product.id, { title: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`comment-${product.id}`}>Review (optional)</Label>
                      <Textarea
                        id={`comment-${product.id}`}
                        value={draft.comment}
                        rows={3}
                        maxLength={1000}
                        placeholder="What did you like or dislike?"
                        onChange={(e) => setDraft(product.id, { comment: e.target.value })}
                      />
                    </div>

                    <Button
                      className="w-full"
                      disabled={draft.submitting}
                      onClick={() => submit(product)}
                    >
                      {draft.submitting
                        ? 'Submitting...'
                        : draft.done
                          ? 'Update Review'
                          : 'Submit Review'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
