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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  minPurchase: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: '',
  minPurchase: '',
  maxDiscount: '',
  usageLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
}

// Convert an ISO timestamp to a value usable by <input type="date">
function toDateInput(value: string | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export function CouponsClient() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/admin/coupons')
      const data = await response.json()
      setCoupons(Array.isArray(data.coupons) ? data.coupons : [])
    } catch (error) {
      console.error('Failed to fetch coupons:', error)
      toast.error('Failed to fetch coupons')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditing(coupon)
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType,
        discountValue: String(coupon.discountValue ?? ''),
        minPurchase: coupon.minPurchase != null ? String(coupon.minPurchase) : '',
        maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : '',
        usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
        startsAt: toDateInput(coupon.startsAt),
        expiresAt: toDateInput(coupon.expiresAt),
        isActive: coupon.isActive,
      })
    } else {
      setEditing(null)
      setFormData(emptyForm)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editing ? `/api/admin/coupons/${editing.id}` : '/api/admin/coupons'
      const response = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          description: formData.description,
          discountType: formData.discountType,
          discountValue: formData.discountValue,
          minPurchase: formData.minPurchase,
          maxDiscount: formData.maxDiscount,
          usageLimit: formData.usageLimit,
          startsAt: formData.startsAt || null,
          expiresAt: formData.expiresAt || null,
          isActive: formData.isActive,
        }),
      })

      if (response.ok) {
        toast.success(editing ? 'Coupon updated!' : 'Coupon created!')
        setIsDialogOpen(false)
        fetchCoupons()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save coupon')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return

    try {
      const response = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Coupon deleted!')
        fetchCoupons()
      } else {
        toast.error('Failed to delete coupon')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred')
    }
  }

  const formatDiscount = (c: Coupon) =>
    c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatPrice(c.discountValue)

  const isExpired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt) < new Date()

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
          <h1 className="text-2xl font-bold font-heading">Coupons</h1>
          <p className="text-muted-foreground">Create and manage discount coupons</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
          Create Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:ticket-linear" className="size-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No coupons yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create discount codes, set usage limits and expiry dates.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
              Create Coupon
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 font-medium">Discount</th>
                  <th className="p-4 font-medium">Min. Purchase</th>
                  <th className="p-4 font-medium">Usage</th>
                  <th className="p-4 font-medium">Expires</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-4">
                      <div className="font-mono font-semibold">{c.code}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground">{c.description}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{formatDiscount(c)}</span>
                      {c.maxDiscount != null && c.discountType === 'PERCENTAGE' && (
                        <div className="text-xs text-muted-foreground">
                          max {formatPrice(c.maxDiscount)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {c.minPurchase != null ? formatPrice(c.minPurchase) : '—'}
                    </td>
                    <td className="p-4">
                      {c.usedCount}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ''}
                    </td>
                    <td className="p-4">
                      {c.expiresAt ? formatDate(c.expiresAt) : 'No expiry'}
                    </td>
                    <td className="p-4">
                      {isExpired(c) ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <Badge variant={c.isActive ? 'default' : 'secondary'}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(c)}>
                          <Icon icon="solar:pen-bold" className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the discount coupon details'
                : 'Create a new discount coupon for customers'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  required
                />
              </div>
              <div>
                <Label htmlFor="discountType">Discount Type *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: 'PERCENTAGE' | 'FIXED') =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., 20% off your first order"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountValue">
                  Discount Value * {formData.discountType === 'PERCENTAGE' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === 'PERCENTAGE' ? '20' : '10.00'}
                  required
                />
              </div>
              <div>
                <Label htmlFor="maxDiscount">Max Discount ($)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  placeholder="Optional cap"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minPurchase">Min. Purchase ($)</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startsAt">Starts At</Label>
                <Input
                  id="startsAt"
                  type="date"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
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
                Active
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
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'} Coupon
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
