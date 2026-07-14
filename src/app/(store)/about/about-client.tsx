'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'

interface AboutPageClientProps {
  page: {
    title: string
    content: string
  }
}

export function AboutPageClient({ page }: AboutPageClientProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <div className="bg-primary px-4 pt-4 pb-6 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-white text-lg font-bold font-heading">About Us</h1>
          <div className="size-6" />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-2xl font-bold font-heading">About Us</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 lg:container lg:mx-auto">
        <div className="max-w-4xl mx-auto py-8">
          <div className="bg-card rounded-xl p-6 lg:p-8 border border-border/50">
            <h1 className="text-3xl font-bold font-heading mb-6">{page.title}</h1>
            <div
              className="prose prose-sm lg:prose-base max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>

          {/* CTA Section */}
          <div className="mt-8 bg-gradient-to-r from-primary to-primary/80 rounded-xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Join the ZALORA Community</h2>
            <p className="mb-6 opacity-90">
              Start your fashion journey with us today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="secondary" size="lg">
                <Link href="/auth/register">
                  <Icon icon="solar:user-plus-bold" className="mr-2 size-5" />
                  Sign Up Now
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Link href="/contact">
                  <Icon icon="solar:letter-bold" className="mr-2 size-5" />
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
