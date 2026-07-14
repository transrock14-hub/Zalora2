'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageGrid } from '@/components/ui/page-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useLanguage } from '@/contexts/language-context'

interface Shop {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  banner: string | null
  status: string
  level: string
  balance: number
  rating: number
  _count: {
    products: number
  }
}

interface ShopStats {
  todayOrders: number
  cumulativeOrders: number
  todaySales: number
  totalSales: number
  todayProfit: number
  totalProfit: number
  followersCount: number
  creditScore: number
}

interface ShopDetailsClientProps {
  shop: Shop
  stats: ShopStats
  userBalance: number
}

const levelColors: Record<string, string> = {
  BRONZE: 'bg-amber-600',
  SILVER: 'bg-gray-400',
  GOLD: 'bg-yellow-500',
  PLATINUM: 'bg-purple-500',
}

const levelIcons: Record<string, string> = {
  BRONZE: 'solar:medal-ribbons-star-bold',
  SILVER: 'solar:medal-ribbons-star-bold',
  GOLD: 'solar:medal-ribbons-star-bold',
  PLATINUM: 'solar:medal-ribbons-star-bold',
}

export function ShopDetailsClient({ shop: initialShop, stats, userBalance }: ShopDetailsClientProps) {
  const { t } = useLanguage()
  const router = useRouter()
  // Once a shop is approved (ACTIVE), the details submitted during the
  // application become locked: the editable settings form is hidden and only
  // the shop logo is shown.
  const isApproved = initialShop.status === 'ACTIVE'
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [formData, setFormData] = useState({
    name: initialShop.name,
    slug: initialShop.slug,
    description: initialShop.description || '',
    logo: initialShop.logo || '',
    banner: initialShop.banner || '',
  })

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploadingLogo(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('folder', 'shops')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload logo')
      }

      setFormData((prev) => ({ ...prev, logo: data.url }))
      toast.success('Logo uploaded!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploadingBanner(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('folder', 'shops')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload banner')
      }

      setFormData((prev) => ({ ...prev, banner: data.url }))
      toast.success('Banner uploaded!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/seller/shop`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update shop')
      }

      toast.success('Shop updated successfully!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/seller/dashboard" className="flex items-center gap-1.5 text-primary-foreground">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
          <span className="text-sm font-medium">{t('back')}</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">{t('shopDetails')}</h1>
        <span className="w-14" />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold font-heading">{t('shopDetails')}</h1>
              <p className="text-muted-foreground mt-1">{t('updateShopDetailsAndSettings')}</p>
            </div>
            <Link href="/seller/dashboard" className="shrink-0">
              <Button variant="outline" className="w-full sm:w-auto">
                <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
                {t('backToDashboard')}
              </Button>
            </Link>
          </div>

      {/* Shop Overview */}
      <Card className="overflow-hidden mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            {/* Shop Logo */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 sm:border-4 border-border shadow-md bg-muted flex-shrink-0">
              {initialShop.logo ? (
                <Image
                  src={initialShop.logo}
                  alt={initialShop.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-500">
                  <span className="text-white font-bold text-xl">
                    {initialShop.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Shop Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{t('storeName')}: {initialShop.name}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('shopLevel')}:</span>
                  <Badge className={`${levelColors[initialShop.level ?? 'BRONZE'] || 'bg-gray-500'} text-white`}>
                    <Icon icon={levelIcons[initialShop.level ?? 'BRONZE'] || 'solar:star-bold'} className="mr-1 size-3" />
                    {initialShop.level ?? 'BRONZE'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('accountBalance')}:</span>
                  <span className="font-semibold">{formatPrice(userBalance)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('storeRating')}:</span>
                  <div className="flex items-center gap-1">
                    <Icon icon="solar:star-bold" className="size-4 text-yellow-500" />
                    <span className="font-semibold">{Number(initialShop.rating).toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('quantityOfProducts')}:</span>
                  <span className="font-semibold">{initialShop._count?.products ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Grid */}
      <PageGrid className="mb-6">
        <StatCard label={t('creditScore')} value={stats.creditScore} />
        <StatCard label={t('todayOrders')} value={stats.todayOrders} />
        <StatCard label={t('cumulativeOrders')} value={stats.cumulativeOrders} />
        <StatCard label={t('todaySales')} value={formatPrice(stats.todaySales)} />
        <StatCard label={t('totalSales')} value={formatPrice(stats.totalSales)} />
        <StatCard label={t('todayProfit')} value={formatPrice(stats.todayProfit)} />
        <StatCard label={t('salesProfit')} value={formatPrice(stats.totalProfit)} />
        <StatCard label={t('followers')} value={stats.followersCount} />
        <StatCard label={t('accountBalance')} value={formatPrice(userBalance)} />
      </PageGrid>

      {/* Shop balance: Top up & Withdraw (same flow as user wallet, admin uses same approval pages) */}
      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('shopBalance')}</h3>
            <div className="flex gap-2">
              <Link href="/account/wallet/topup">
                <Button size="sm">
                  <Icon icon="solar:add-circle-bold" className="mr-1 size-4" />
                  {t('topUp')}
                </Button>
              </Link>
              <Link href="/account/wallet/withdraw">
                <Button size="sm" variant="outline">
                  <Icon icon="solar:download-bold" className="mr-1 size-4" />
                  {t('withdraw')}
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-2xl font-bold text-primary">{formatPrice(userBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Same as Account Balance and homepage. Order processing deducts wholesale; delivery credits
            sales; order refunds return the wholesale. Top-up/withdraw requests are reviewed in Admin.
          </p>
          <div className="flex gap-4 mt-4 text-sm">
            <Link href="/account/wallet/recharge-record" className="text-primary hover:underline">
              {t('rechargeRecord')}
            </Link>
            <Link href="/account/wallet/withdrawal-record" className="text-primary hover:underline">
              {t('withdrawalRecord')}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Shop Settings Form — hidden once the shop is approved. The applied
          details become locked and only the shop overview (with logo) remains. */}
      {!isApproved && (
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">{t('shopSettings')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('shopName')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">{t('shopUrlSlug')} *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('yourShopUrl')}: /shop/{formData.slug}
              </p>
            </div>

            <div>
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="logo">{t('shopLogo')}</Label>
              <div className="mt-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                {formData.logo && (
                  <div className="mt-4 relative w-32 h-32 rounded-lg overflow-hidden border border-border">
                    <Image src={formData.logo} alt="Logo" fill className="object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="banner">Shop Banner</Label>
              <div className="mt-2">
                <Input
                  id="banner"
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                />
                {formData.banner && (
                  <div className="mt-4 relative w-full h-48 rounded-lg overflow-hidden border border-border">
                    <Image src={formData.banner} alt="Banner" fill className="object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? t('saving') : t('saveChanges')}
              </Button>
              <Link href="/seller/dashboard" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  {t('cancel')}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      )}
        </div>
      </div>
    </div>
  )
}
