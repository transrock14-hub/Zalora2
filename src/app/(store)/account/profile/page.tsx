'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { useLanguage } from '@/contexts/language-context'

export default function ProfilePage() {
  const { t } = useLanguage()
  const router = useRouter()
  const setUser = useUserStore((state) => state.setUser)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/account/profile', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setFormData({
            name: data.name ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            avatar: data.avatar ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProfile(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3MB')
      return
    }
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'avatars')
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setFormData((prev) => ({ ...prev, avatar: data.url }))
      toast.success(t('photoUpdatedSaveToApply'))
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast.success('Profile updated successfully!')
      const meRes = await fetch('/api/auth/me', { credentials: 'include' })
      const meData = await meRes.json()
      if (meData.user) setUser(meData.user)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || t('failedToUpdateProfile'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white flex items-center">
          <Icon icon="solar:arrow-left-linear" className="size-6" aria-hidden />
          <span className="sr-only">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          {t('editProfile')}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="hidden lg:block mb-6">
            <h1 className="text-2xl font-bold font-heading">{t('editProfile')}</h1>
            <p className="text-muted-foreground mt-2">{t('updateYourPersonalInformation')}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('personalInformation')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <div className="flex justify-center py-8 text-muted-foreground">{t('loading')}</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex justify-center mb-6">
                    <label className="relative cursor-pointer">
                      <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                        {formData.avatar ? (
                          <Image
                            src={formData.avatar}
                            alt="Avatar"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                            onError={() => setFormData((prev) => ({ ...prev, avatar: '' }))}
                          />
                        ) : (
                          <Icon icon="solar:user-bold" className="size-12 text-primary" />
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-white flex items-center justify-center shadow">
                        {uploadingAvatar ? (
                          <Icon icon="solar:refresh-circle-linear" className="size-4 animate-spin" />
                        ) : (
                          <Icon icon="solar:camera-bold" className="size-4" />
                        )}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAvatarChange}
                        disabled={uploadingAvatar}
                      />
                    </label>
                  </div>

                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('saving') : t('saveChanges')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
