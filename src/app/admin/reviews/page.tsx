import { ReviewsClient } from './reviews-client'

export const metadata = {
  title: 'Reviews - Admin',
  description: 'Moderate product reviews',
}

export default function AdminReviewsPage() {
  return <ReviewsClient />
}
