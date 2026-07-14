import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'

/**
 * Shared stat card: label (small muted) + value (large bold).
 * Matches account/seller stats pattern. Responsive padding and value size.
 */
export interface StatCardProps {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, className }, ref) => (
    <Card ref={ref} className={cn(className)}>
      <CardContent className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground mb-1 sm:mb-2">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
)
StatCard.displayName = 'StatCard'

export { StatCard }
