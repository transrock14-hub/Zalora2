'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import toast from 'react-hot-toast'

interface Address {
  id: string
  name: string
  phone: string
  country: string
  state: string
  city: string
  address: string
  postalCode: string
  isDefault: boolean
  createdAt: string
}

const emptyForm = {
  name: '',
  phone: '',
  country: '',
  state: '',
  city: '',
  address: '',
  postalCode: '',
  isDefault: false,
}

export function AddressesClient() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchAddresses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/addresses', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setAddresses(data.addresses || [])
    } catch {
      toast.error('Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (a: Address) => {
    setEditingId(a.id)
    setForm({
      name: a.name,
      phone: a.phone,
      country: a.country,
      state: a.state,
      city: a.city,
      address: a.address,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.address || !form.city || !form.country) {
      toast.error('Please fill in name, phone, address, city and country')
      return
    }
    setSaving(true)
    try {
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast.success(editingId ? 'Address updated' : 'Address added')
      setDialogOpen(false)
      fetchAddresses()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const setDefault = async (id: string) => {
    const addr = addresses.find((a) => a.id === id)
    if (!addr || addr.isDefault) return
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...addr, isDefault: true }),
      })
      if (!res.ok) throw new Error('Failed to set default')
      toast.success('Default address updated')
      fetchAddresses()
    } catch {
      toast.error('Failed to set default address')
    }
  }

  const deleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Address deleted')
      fetchAddresses()
    } catch {
      toast.error('Failed to delete address')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          Delivery Addresses
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="hidden lg:block mb-6">
            <h1 className="text-3xl font-bold font-heading">Delivery Addresses</h1>
            <p className="text-muted-foreground mt-2">Manage your shipping addresses</p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Icon icon="solar:refresh-circle-linear" className="size-10 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : addresses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon icon="solar:map-point-linear" className="size-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">No addresses saved</h3>
                <p className="text-muted-foreground mb-4 text-center">
                  Add a shipping address to make checkout faster
                </p>
                <Button onClick={openAdd}>
                  <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
                  Add New Address
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={openAdd}>
                  <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
                  Add New Address
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((a) => (
                  <Card key={a.id} className={a.isDefault ? 'border-primary' : ''}>
                    <CardContent className="p-4">
                      {a.isDefault && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary text-primary-foreground mb-2">
                          Default
                        </span>
                      )}
                      <p className="font-medium">{a.name}</p>
                      <p className="text-sm text-muted-foreground">{a.phone}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {[a.address, a.city, a.state, a.postalCode].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-sm text-muted-foreground">{a.country}</p>
                      <div className="flex gap-2 mt-3">
                        {!a.isDefault && (
                          <Button variant="outline" size="sm" onClick={() => setDefault(a.id)}>
                            Set default
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteAddress(a.id)}>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode">ZIP / Postal code</Label>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="ZIP"
                />
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Country"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="size-4 rounded border-border accent-primary"
              />
              <Label htmlFor="isDefault">Set as default address</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add address'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
