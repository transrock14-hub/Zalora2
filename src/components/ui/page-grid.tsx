import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Responsive grid for page content (e.g. stat cards).
 * Default: 2 cols mobile, 3 sm, 4 lg. Gap 3 sm:gap-4.
 */
export interface PageGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Grid class overrides; default: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 */
  gridClass?: string
}

const PageGrid = React.forwardRef<HTMLDivElement, PageGridProps>(
  ({ className, gridClass = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('grid gap-3 sm:gap-4', gridClass, className)}
      {...props}
    />
  )
)
PageGrid.displayName = 'PageGrid'

export { PageGrid }
