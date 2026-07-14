'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, slugify } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Page {
  id: string
  slug: string
  title: string
  content: string
  metaTitle: string | null
  metaDesc: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  slug: '',
  title: '',
  content: '',
  metaTitle: '',
  metaDesc: '',
  isActive: true,
}

export function PagesClient() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Page | null>(null)
  const [saving, setSaving] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/admin/pages')
      const data = await response.json()
      setPages(Array.isArray(data.pages) ? data.pages : [])
    } catch (error) {
      console.error('Failed to fetch pages:', error)
      toast.error('Failed to fetch pages')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (page?: Page) => {
    if (page) {
      setEditing(page)
      setSlugEdited(true)
      setFormData({
        slug: page.slug,
        title: page.title,
        content: page.content,
        metaTitle: page.metaTitle || '',
        metaDesc: page.metaDesc || '',
        isActive: page.isActive,
      })
    } else {
      setEditing(null)
      setSlugEdited(false)
      setFormData(emptyForm)
    }
    setIsDialogOpen(true)
  }

  const handleTitleChange = (title: string) => {
    // Auto-fill slug from title until the user edits the slug manually (new pages only)
    setFormData((prev) => ({
      ...prev,
      title,
      slug: !editing && !slugEdited ? slugify(title) : prev.slug,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editing ? `/api/admin/pages/${editing.id}` : '/api/admin/pages'
      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editing ? 'Page updated!' : 'Page created!')
        setIsDialogOpen(false)
        fetchPages()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save page')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const response = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Page deleted!')
        fetchPages()
      } else {
        toast.error('Failed to delete page')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Icon icon="solar:refresh-circle-linear" className="size-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">CMS Pages</h1>
          <p className="text-muted-foreground">
            Manage static pages like About, Terms, Privacy Policy
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
          Add Page
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:document-text-linear" className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No pages yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create static content pages such as About Us, Terms &amp; Conditions, and Privacy Policy.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
              Add Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Title</th>
                  <th className="p-4 font-medium">Slug / URL</th>
                  <th className="p-4 font-medium">Updated</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium">{p.title}</td>
                    <td className="p-4">
                      <a
                        href={`/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        /{p.slug}
                      </a>
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(p.updatedAt)}</td>
                    <td className="p-4">
                      <Badge variant={p.isActive ? 'default' : 'secondary'}>
                        {p.isActive ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)}>
                          <Icon icon="solar:pen-bold" className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                          <Icon icon="solar:trash-bin-trash-bold" className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Page' : 'Add Page'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this static content page'
                : 'Create a new static content page for the storefront'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="About Us"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setSlugEdited(true)
                    setFormData({ ...formData, slug: e.target.value })
                  }}
                  placeholder="about-us"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The page will be available at <span className="font-mono">/{formData.slug || 'slug'}</span>
              </p>
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Page content (HTML supported)"
                rows={10}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                HTML is supported (e.g. &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="SEO title (optional)"
                />
              </div>
              <div>
                <Label htmlFor="metaDesc">Meta Description</Label>
                <Input
                  id="metaDesc"
                  value={formData.metaDesc}
                  onChange={(e) => setFormData({ ...formData, metaDesc: e.target.value })}
                  placeholder="SEO description (optional)"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Published (visible on storefront)
              </Label>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'} Page
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
