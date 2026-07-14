"use client"

import { Icon } from '@iconify/react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Icon
          icon="solar:refresh-circle-bold"
          className="size-12 text-primary animate-spin"
        />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
