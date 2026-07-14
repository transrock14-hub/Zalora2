'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'

interface CmsPageClientProps {
  page: {
    title: string
    content: string
  }
}

export function CmsPageClient({ page }: CmsPageClientProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <div className="bg-primary px-4 pt-4 pb-6 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-white text-lg font-bold font-heading line-clamp-1">{page.title}</h1>
          <div className="size-6" />
        </div>
      </div>

      <div className="hidden lg:block container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-2xl font-bold font-heading">{page.title}</h1>
        </div>
      </div>

      <div className="flex-1 px-4 lg:container lg:mx-auto">
        <div className="max-w-4xl mx-auto py-8">
          <div className="bg-card rounded-xl p-6 lg:p-8 border border-border/50">
            <h1 className="text-3xl font-bold font-heading mb-6 lg:hidden">{page.title}</h1>
            <div
              className="prose prose-sm lg:prose-base max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
