import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Section with optional title. Matches account "My Orders" style:
 * title row: px-4 py-3 text-sm font-semibold border-b border-border
 */
export interface SectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
}

const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  ({ title, className, children, ...props }, ref) => (
    <div ref={ref} className={cn('bg-card', className)} {...props}>
      {title != null && (
        <div className="px-4 py-3 text-sm font-semibold border-b border-border">
          {title}
        </div>
      )}
      {children}
    </div>
  )
)
Section.displayName = 'Section'

export { Section }
