'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'

interface CreateShopClientProps {
  categories: Array<{ id: string; name: string }>
}

export function CreateShopClient({ categories }: CreateShopClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
    banner: '',
    contactName: '',
    idNumber: '',
    inviteCode: '',
    idCardFront: '',
    idCardBack: '',
    mainBusiness: '',
    detailedAddress: '',
  })
  const [uploadingIdFront, setUploadingIdFront] = useState(false)
  const [uploadingIdBack, setUploadingIdBack] = useState(false)

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

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData((prev) => ({ ...prev, slug }))
  }

  const handleIdCardUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    side === 'front' ? setUploadingIdFront(true) : setUploadingIdBack(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'kyc')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setFormData((prev) => ({
        ...prev,
        [side === 'front' ? 'idCardFront' : 'idCardBack']: data.url,
      }))
      toast.success('ID card uploaded')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingIdFront(false)
      setUploadingIdBack(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/seller/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create shop')
      }

      toast.success('Shop application submitted! Your verification is pending admin approval.')
      router.push('/seller/verification-status')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="flex items-center gap-1.5 text-primary-foreground">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading truncate max-w-[60%]">Apply for shop</h1>
        <span className="w-14" />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold font-heading">Shop application & KYC verification</h1>
              <p className="text-muted-foreground mt-1">Open your shop by completing identity verification (KYC) and store details</p>
            </div>
            <Link href="/account" className="shrink-0">
              <Button variant="outline" className="w-full sm:w-auto">
                <Icon icon="solar:arrow-left-linear" className="mr-2 size-4" />
                Back
              </Button>
            </Link>
          </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <p className="font-medium flex items-center gap-2">
          <Icon icon="solar:shield-check-bold" className="size-5 text-primary" />
          Identity verification required
        </p>
        <p className="text-muted-foreground mt-1">
          To open a shop, we verify your identity (KYC). Please provide accurate details and clear ID documents. Your application will be reviewed by our team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shop & identity details</CardTitle>
            <p className="text-sm text-muted-foreground">Store information and KYC documents for verification</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logo">Store Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:bg-muted/50">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                  {formData.logo ? (
                    <div className="relative h-full w-full rounded-full overflow-hidden">
                      <Image src={formData.logo} alt="Logo" fill className="object-cover" />
                    </div>
                  ) : (
                    <Icon icon="solar:gallery-bold" className="size-8 text-muted-foreground" />
                  )}
                </label>
                {uploadingLogo && <span className="text-sm text-muted-foreground">Uploading...</span>}
              </div>
            </div>

            <div>
              <Label htmlFor="name">* Store Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Please enter the store name"
                required
              />
            </div>

            <div>
              <Label htmlFor="contactName">* Contact</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="Please enter a contact person"
                required
              />
            </div>

            <div>
              <Label htmlFor="idNumber">* ID number</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => setFormData((p) => ({ ...p, idNumber: e.target.value }))}
                placeholder="Please enter your ID number"
                required
              />
            </div>

            <div>
              <Label htmlFor="inviteCode">Invite Code (optional)</Label>
              <Input
                id="inviteCode"
                value={formData.inviteCode}
                onChange={(e) => setFormData((p) => ({ ...p, inviteCode: e.target.value }))}
                placeholder="Please enter the invitation code"
              />
            </div>

            <div>
              <Label>ID card</Label>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="flex aspect-[1.6] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-2 hover:bg-muted/30">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleIdCardUpload(e, 'front')}
                      disabled={uploadingIdFront}
                    />
                    {formData.idCardFront ? (
                      <div className="relative h-20 w-full">
                        <Image src={formData.idCardFront} alt="ID front" fill className="object-contain" />
                      </div>
                    ) : (
                      <Icon icon="solar:document-bold" className="size-10 text-muted-foreground" />
                    )}
                  </label>
                  <p className="mt-1 text-center text-xs text-muted-foreground">ID card front photo</p>
                </div>
                <div>
                  <label className="flex aspect-[1.6] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-2 hover:bg-muted/30">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleIdCardUpload(e, 'back')}
                      disabled={uploadingIdBack}
                    />
                    {formData.idCardBack ? (
                      <div className="relative h-20 w-full">
                        <Image src={formData.idCardBack} alt="ID back" fill className="object-contain" />
                      </div>
                    ) : (
                      <Icon icon="solar:document-bold" className="size-10 text-muted-foreground" />
                    )}
                  </label>
                  <p className="mt-1 text-center text-xs text-muted-foreground">Photo of the back of your ID card</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="mainBusiness">* Main Business</Label>
              <Input
                id="mainBusiness"
                value={formData.mainBusiness}
                onChange={(e) => setFormData((p) => ({ ...p, mainBusiness: e.target.value }))}
                placeholder="Select or enter main business"
              />
            </div>

            <div>
              <Label htmlFor="detailedAddress">* Detailed address</Label>
              <Textarea
                id="detailedAddress"
                value={formData.detailedAddress}
                onChange={(e) => setFormData((p) => ({ ...p, detailedAddress: e.target.value }))}
                placeholder="Please enter the detailed address"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="slug">Shop URL Slug *</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="my-shop"
                  required
                />
                <Button type="button" variant="outline" onClick={generateSlug}>
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Tell customers about your shop..."
                rows={3}
              />
            </div>

            <div>
              <Label>Shop Banner</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                />
                {formData.banner && (
                  <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border">
                    <Image src={formData.banner} alt="Banner" fill className="object-cover" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Submitting...' : 'Submit application'}
          </Button>
          <Link href="/account" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
        </div>
      </div>
    </div>
  )
}
