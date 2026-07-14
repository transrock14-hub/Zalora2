import { Suspense } from 'react'
import { OrdersClient } from './orders-client'

export const metadata = {
  title: 'Orders - Admin',
  description: 'Manage customer orders',
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96 text-muted-foreground">Loading orders...</div>
      }
    >
      <OrdersClient />
    </Suspense>
  )
}
