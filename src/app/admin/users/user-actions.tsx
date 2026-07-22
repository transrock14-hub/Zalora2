'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  canSell?: boolean
  shop?: {
    id: string
    name: string
    status: string
  } | null
}

export function UserActions({ user }: { user: User }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [savingPasswords, setSavingPasswords] = useState(false)
  const [editData, setEditData] = useState({
    role: user.role,
    status: user.status,
  })
  const [passwordData, setPasswordData] = useState({
    loginPassword: '',
    paymentPassword: '',
  })

  const handleLoginAsUser = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users/login-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login as user')
      }

      toast.success(`Now viewing as ${user.name}`)
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      toast.success('User updated successfully')
      setEditDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePasswords = async () => {
    const loginPassword = passwordData.loginPassword.trim()
    const paymentPassword = passwordData.paymentPassword.trim()
    if (!loginPassword && !paymentPassword) {
      toast.error('Enter a login password and/or payment password')
      return
    }
    if (loginPassword && loginPassword.length < 6) {
      toast.error('Login password must be at least 6 characters')
      return
    }
    if (paymentPassword && paymentPassword.length < 6) {
      toast.error('Payment password must be at least 6 characters')
      return
    }

    try {
      setSavingPasswords(true)
      const res = await fetch(`/api/admin/users/${user.id}/passwords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(loginPassword ? { loginPassword } : {}),
          ...(paymentPassword ? { paymentPassword } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to update passwords')
      toast.success(data.message || 'Passwords updated')
      setPasswordData({ loginPassword: '', paymentPassword: '' })
      setPasswordDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update passwords')
    } finally {
      setSavingPasswords(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        let message = 'Failed to delete user'
        try {
          const data = await res.json()
          if (data && typeof data.error === 'string') {
            message = data.error
          }
        } catch {
          // Response had no/invalid JSON; keep default message
        }
        throw new Error(message)
      }

      toast.success('User deleted successfully')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={loading}>
            <Icon icon="solar:menu-dots-bold" className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Icon icon="solar:pen-bold" className="mr-2 size-4" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setPasswordData({ loginPassword: '', paymentPassword: '' })
              setPasswordDialogOpen(true)
            }}
          >
            <Icon icon="solar:lock-password-bold" className="mr-2 size-4" />
            Set Passwords
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLoginAsUser}>
            <Icon icon="solar:eye-bold" className="mr-2 size-4" />
            Login as User
          </DropdownMenuItem>
          {user.shop && (
            <DropdownMenuItem asChild>
              <a href={`/admin/shops/${user.shop.id}`}>
                <Icon icon="solar:shop-bold" className="mr-2 size-4" />
                View Shop
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteUser}
            className="text-destructive focus:text-destructive"
          >
            <Icon icon="solar:trash-bin-trash-bold" className="mr-2 size-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Set Passwords Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Passwords</DialogTitle>
            <DialogDescription>
              Change login and/or payment (withdraw) password for {user.name}. Leave a field
              blank to leave that password unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`login-pw-${user.id}`}>Login password</Label>
              <Input
                id={`login-pw-${user.id}`}
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
                value={passwordData.loginPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, loginPassword: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pay-pw-${user.id}`}>Payment / withdraw password</Label>
              <Input
                id={`pay-pw-${user.id}`}
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
                value={passwordData.paymentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, paymentPassword: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={savingPasswords}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePasswords} disabled={savingPasswords}>
              {savingPasswords ? 'Saving...' : 'Save Passwords'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user settings for {user.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editData.role}
                onValueChange={(value) => setEditData({ ...editData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editData.status}
                onValueChange={(value) => setEditData({ ...editData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="BANNED">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
              Shop applications do not need a Can Sell flag. Approve or reject each shop from Admin → Shops / KYC.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} loading={loading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
