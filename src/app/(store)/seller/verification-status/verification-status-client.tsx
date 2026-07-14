'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

interface VerificationStatusClientProps {
  verification: {
    id: string
    shopId: string
    status: string
    rejectionReason: string | null
    reviewedAt: string | null
    createdAt: string
  } | null
  shop: {
    id: string
    name: string
    slug: string
    status: string
  } | null
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: 'solar:clock-circle-bold',
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'solar:verified-check-bold',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'solar:close-circle-bold',
  },
}

export function VerificationStatusClient({
  verification,
  shop,
}: VerificationStatusClientProps) {
  if (!verification) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm lg:hidden">
          <Link href="/account" className="flex items-center gap-1.5 text-primary-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-semibold text-primary-foreground font-heading">KYC status</h1>
          <span className="w-14" />
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold font-heading">KYC verification status</h1>
              <Link href="/account">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
                  Back to account
                </Button>
              </Link>
            </div>
            <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:shield-keyhole-bold" className="size-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shop application yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Opening a shop requires identity verification (KYC). Submit a shop application with your details and ID documents; your verification status will appear here after submission.
            </p>
            <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground mb-6 max-w-md">
              <p className="font-medium text-foreground mb-1">Process</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Apply for a shop and complete KYC</li>
                <li>We review your application</li>
                <li>Once approved, your shop goes live</li>
              </ol>
            </div>
            <Link href="/seller/create-shop">
              <Button>
                <Icon icon="solar:shop-bold" className="mr-2 size-4" />
                Apply for a shop
              </Button>
            </Link>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    )
  }

  const config = statusConfig[verification.status] || statusConfig.PENDING

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href={verification.status === 'APPROVED' ? '/seller/shop' : '/account'} className="flex items-center gap-1.5 text-primary-foreground">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">KYC status</h1>
        <span className="w-14" />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold font-heading">KYC verification status</h1>
            <Link href={verification.status === 'APPROVED' ? '/seller/shop' : '/account'}>
              <Button variant="outline" className="w-full sm:w-auto">
                <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
                {verification.status === 'APPROVED' ? 'Shop Management' : 'Back to account'}
              </Button>
            </Link>
          </div>

          <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Verification Status</CardTitle>
            <Badge className={config.color}>
              <Icon icon={config.icon} className="mr-1 size-4" />
              {config.label}
            </Badge>
          </div>
          {shop && (
            <p className="text-sm text-muted-foreground">
              Shop: <span className="font-medium text-foreground">{shop.name}</span>
              {shop.status === 'PENDING' && (
                <span className="ml-2 text-amber-600">(Shop approval pending)</span>
              )}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{formatDateTime(verification.createdAt)}</span>
            </div>
            {verification.reviewedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviewed</span>
                <span>{formatDateTime(verification.reviewedAt)}</span>
              </div>
            )}
          </div>

          {verification.status === 'PENDING' && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your application is under review. When an admin approves your shop, your verification will be marked as Approved and you will be able to access your shop dashboard.
              </p>
            </div>
          )}

          {verification.status === 'APPROVED' && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Your verification has been approved. You can now manage your shop and start selling.
              </p>
              <Link href="/seller/shop" className="mt-3 inline-block">
                <Button size="sm">
                  <Icon icon="solar:shop-bold" className="mr-2 size-4" />
                  Shop Management
                </Button>
              </Link>
            </div>
          )}

          {verification.status === 'REJECTED' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Rejection reason</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {verification.rejectionReason || 'Your application was not approved. Please contact support for more information.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  )
}
