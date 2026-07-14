'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import toast from 'react-hot-toast'

interface CryptoAddress {
  id: string
  currency: string
  address: string
  network: string | null
  label: string | null
  qrCode: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function CryptoAddressesClient() {
  const [addresses, setAddresses] = useState<CryptoAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CryptoAddress | null>(null)
  const [formData, setFormData] = useState({
    currency: '',
    address: '',
    network: '',
    label: '',
    qrCode: '',
    isActive: true,
  })

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/admin/crypto-addresses')
      const data = await response.json()
      setAddresses(data.addresses)
    } catch (error) {
      console.error('Failed to fetch addresses:', error)
      toast.error('Failed to fetch crypto addresses')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (address?: CryptoAddress) => {
    if (address) {
      setEditingAddress(address)
      setFormData({
        currency: address.currency,
        address: address.address,
        network: address.network || '',
        label: address.label || '',
        qrCode: address.qrCode || '',
        isActive: address.isActive,
      })
    } else {
      setEditingAddress(null)
      setFormData({
        currency: '',
        address: '',
        network: '',
        label: '',
        qrCode: '',
        isActive: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingAddress
        ? `/api/admin/crypto-addresses/${editingAddress.id}`
        : '/api/admin/crypto-addresses'

      const response = await fetch(url, {
        method: editingAddress ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingAddress ? 'Address updated!' : 'Address added!')
        setIsDialogOpen(false)
        fetchAddresses()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save address')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('An error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return

    try {
      const response = await fetch(`/api/admin/crypto-addresses/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Address deleted!')
        fetchAddresses()
      } else {
        toast.error('Failed to delete address')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Address copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Icon icon="solar:refresh-circle-linear" className="size-12 animate-spin text-primary" />
      </div>
    )
  }

  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading">Crypto Payment Addresses</h1>
          <p className="text-muted-foreground mt-1">
            Manage cryptocurrency payment addresses for customer orders
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Icon icon="solar:add-circle-bold" className="mr-2 size-5" />
          Add Address
        </Button>
      </div>

      {/* Addresses Grid */}
      {safeAddresses.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Icon icon="solar:wallet-linear" className="size-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Crypto Addresses</h3>
          <p className="text-muted-foreground mb-6">
            Add your first cryptocurrency payment address
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Icon icon="solar:add-circle-bold" className="mr-2 size-5" />
            Add Address
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeAddresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{addr.currency}</h3>
                    <Badge variant={addr.isActive ? 'default' : 'secondary'}>
                      {addr.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {addr.network && (
                    <p className="text-xs text-muted-foreground">{addr.network}</p>
                  )}
                  {addr.label && (
                    <p className="text-sm text-muted-foreground mt-1">{addr.label}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(addr)}
                  >
                    <Icon icon="solar:pen-bold" className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(addr.id)}
                  >
                    <Icon icon="solar:trash-bin-trash-bold" className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                <p className="text-xs font-mono break-all text-foreground">
                  {addr.address}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => copyToClipboard(addr.address)}
              >
                <Icon icon="solar:copy-bold" className="mr-2 size-4" />
                Copy Address
              </Button>

              {addr.qrCode && (
                <div className="mt-4 pt-4 border-t border-border">
                  <img
                    src={addr.qrCode}
                    alt="QR Code"
                    className="w-full h-auto rounded"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Crypto Address' : 'Add Crypto Address'}
            </DialogTitle>
            <DialogDescription>
              {editingAddress
                ? 'Update the cryptocurrency payment address details'
                : 'Add a new cryptocurrency payment address for customer orders'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="currency">Cryptocurrency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT_TRC20">USDT (TRC20)</SelectItem>
                  <SelectItem value="USDT_ERC20">USDT (ERC20)</SelectItem>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address">Wallet Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter wallet address"
                required
              />
            </div>

            <div>
              <Label htmlFor="network">Network</Label>
              <Input
                id="network"
                value={formData.network}
                onChange={(e) =>
                  setFormData({ ...formData, network: e.target.value })
                }
                placeholder="e.g., TRC20, ERC20, Bitcoin, Ethereum"
              />
            </div>

            <div>
              <Label htmlFor="label">Label (Optional)</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g., Main Wallet, Business Account"
              />
            </div>

            <div>
              <Label htmlFor="qrCode">QR Code URL (Optional)</Label>
              <Input
                id="qrCode"
                value={formData.qrCode}
                onChange={(e) =>
                  setFormData({ ...formData, qrCode: e.target.value })
                }
                placeholder="https://example.com/qr-code.png"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="size-4 rounded border-border"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (show in checkout)
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
              <Button type="submit" className="flex-1">
                {editingAddress ? 'Update' : 'Add'} Address
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
