'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/lib/utils'

interface HeroSlide {
  id: string
  title: string | null
  subtitle: string | null
  image: string
  mobileImage: string | null
  ctaText: string | null
  ctaLink: string | null
  sortOrder: number
  isActive: boolean
  startsAt: Date | null
  endsAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface HomepageClientProps {
  heroSlides: HeroSlide[]
}

export function HomepageClient({ heroSlides: initialSlides }: HomepageClientProps) {
  const [heroSlides, setHeroSlides] = useState(initialSlides)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null)
  const [mobilePreview, setMobilePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image: '',
    mobileImage: '',
    ctaText: '',
    ctaLink: '',
    isActive: true,
    sortOrder: 0,
  })

  const openDialog = (slide?: HeroSlide) => {
    if (slide) {
      setEditingSlide(slide)
      setFormData({
        title: slide.title || '',
        subtitle: slide.subtitle || '',
        image: slide.image,
        mobileImage: slide.mobileImage || '',
        ctaText: slide.ctaText || '',
        ctaLink: slide.ctaLink || '',
        isActive: slide.isActive,
        sortOrder: slide.sortOrder,
      })
      setDesktopPreview(slide.image)
      setMobilePreview(slide.mobileImage)
    } else {
      setEditingSlide(null)
      setFormData({
        title: '',
        subtitle: '',
        image: '',
        mobileImage: '',
        ctaText: '',
        ctaLink: '',
        isActive: true,
        sortOrder: heroSlides.length,
      })
      setDesktopPreview(null)
      setMobilePreview(null)
    }
    setIsDialogOpen(true)
  }

  const handleDesktopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingDesktop(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('folder', 'hero-slides')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setFormData((prev) => ({ ...prev, image: data.url }))
      setDesktopPreview(data.url)
      toast.success('Desktop image uploaded!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingDesktop(false)
    }
  }

  const handleMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingMobile(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('folder', 'hero-slides')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setFormData((prev) => ({ ...prev, mobileImage: data.url }))
      setMobilePreview(data.url)
      toast.success('Mobile image uploaded!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploadingMobile(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.image) {
      toast.error('Please upload a desktop image')
      return
    }

    setLoading(true)

    try {
      const url = editingSlide
        ? `/api/admin/hero-slides/${editingSlide.id}`
        : '/api/admin/hero-slides'
      
      const method = editingSlide ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save slide')
      }

      toast.success(editingSlide ? 'Slide updated!' : 'Slide created!')
      
      // Refresh slides
      const refreshRes = await fetch('/api/admin/hero-slides', {
        credentials: 'include',
      })
      const refreshData = await refreshRes.json()
      setHeroSlides(refreshData.slides)
      
      setIsDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return

    setLoading(true)

    try {
      const res = await fetch(`/api/admin/hero-slides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete slide')
      }

      toast.success('Slide deleted!')
      setHeroSlides(heroSlides.filter((s) => s.id !== id))
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (slide: HeroSlide) => {
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !slide.isActive }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update slide')
      }

      toast.success(slide.isActive ? 'Slide hidden' : 'Slide activated')
      
      // Update local state
      setHeroSlides(
        heroSlides.map((s) => (s.id === slide.id ? { ...s, isActive: !s.isActive } : s))
      )
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const moveSlide = async (slideId: string, direction: 'up' | 'down') => {
    const currentIndex = heroSlides.findIndex((s) => s.id === slideId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= heroSlides.length) return

    const newSlides = [...heroSlides]
    const [movedSlide] = newSlides.splice(currentIndex, 1)
    newSlides.splice(newIndex, 0, movedSlide)

    // Update sortOrder
    const updatedSlides = newSlides.map((slide, index) => ({
      ...slide,
      sortOrder: index,
    }))

    setHeroSlides(updatedSlides)

    // Save to server
    try {
      await fetch('/api/admin/hero-slides/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          slides: updatedSlides.map((s) => ({ id: s.id, sortOrder: s.sortOrder })),
        }),
      })
      toast.success('Slide order updated!')
    } catch (error) {
      toast.error('Failed to update order')
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Homepage Management</h1>
          <p className="text-muted-foreground">Manage hero sliders and homepage content</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
              Add Slide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSlide ? 'Edit Slide' : 'Add New Slide'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Welcome to ZALORA"
                  />
                </div>
                <div>
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Fall Sale"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image">Desktop Image {!editingSlide && <span className="text-red-500">*</span>}</Label>
                <div className="space-y-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleDesktopImageUpload}
                    disabled={uploadingDesktop}
                  />
                  {uploadingDesktop && (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  )}
                  {(desktopPreview || formData.image) && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                      <Image
                        src={desktopPreview || formData.image}
                        alt="Desktop preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  {editingSlide && formData.image && (
                    <p className="text-xs text-muted-foreground">
                      Current image. Upload a new file to replace it.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="mobileImage">Mobile Image (optional)</Label>
                <div className="space-y-2">
                  <Input
                    id="mobileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleMobileImageUpload}
                    disabled={uploadingMobile}
                  />
                  {uploadingMobile && (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  )}
                  {mobilePreview && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                      <Image
                        src={mobilePreview}
                        alt="Mobile preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  {formData.mobileImage && !mobilePreview && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                      <Image
                        src={formData.mobileImage}
                        alt="Mobile image"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ctaText">CTA Button Text</Label>
                  <Input
                    id="ctaText"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="Shop Now"
                  />
                </div>
                <div>
                  <Label htmlFor="ctaLink">CTA Button Link</Label>
                  <Input
                    id="ctaLink"
                    value={formData.ctaLink}
                    onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                    placeholder="/products"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : editingSlide ? 'Update Slide' : 'Create Slide'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hero Slides */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Slider</CardTitle>
        </CardHeader>
        <CardContent>
          {heroSlides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon icon="solar:gallery-wide-linear" className="size-16 mx-auto mb-4 opacity-30" />
              <p>No hero slides yet. Add your first slide to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {heroSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  {/* Slide Preview */}
                  <div className="relative size-20 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={slide.image}
                      alt={slide.title || 'Slide'}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Slide Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{slide.title || 'Untitled Slide'}</h3>
                      {slide.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                      <Badge variant="outline">Order: {slide.sortOrder + 1}</Badge>
                    </div>
                    {slide.subtitle && (
                      <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated: {formatDateTime(slide.updatedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-6"
                        onClick={() => moveSlide(slide.id, 'up')}
                        disabled={index === 0}
                      >
                        <Icon icon="solar:arrow-up-linear" className="size-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-6"
                        onClick={() => moveSlide(slide.id, 'down')}
                        disabled={index === heroSlides.length - 1}
                      >
                        <Icon icon="solar:arrow-down-linear" className="size-3" />
                      </Button>
                    </div>

                    {/* Toggle Active */}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleToggleActive(slide)}
                      disabled={loading}
                    >
                      <Icon
                        icon={slide.isActive ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                        className="size-4"
                      />
                    </Button>

                    {/* Edit */}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openDialog(slide)}
                      disabled={loading}
                    >
                      <Icon icon="solar:pen-bold" className="size-4" />
                    </Button>

                    {/* Delete */}
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(slide.id)}
                      disabled={loading}
                    >
                      <Icon icon="solar:trash-bin-trash-bold" className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
