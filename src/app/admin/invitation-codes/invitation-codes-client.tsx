'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CodeRow {
  id: string
  code: string
  type: 'DIRECT' | 'REFERRAL'
  referrerUserId: string | null
  usedByUserId: string | null
  usedAt: string | null
  note: string | null
  createdAt: string
  referrer?: { id: string; name: string; email: string } | null
  usedBy?: { id: string; name: string; email: string } | null
}

interface UserOption {
  id: string
  name: string
  email: string
}

export function InvitationCodesClient() {
  const [codes, setCodes] = useState<CodeRow[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [genType, setGenType] = useState<'DIRECT' | 'REFERRAL'>('DIRECT')
  const [referrerUserId, setReferrerUserId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const q = filter === 'all' ? '' : `?status=${filter}`
      const res = await fetch(`/api/admin/invitation-codes${q}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setCodes(Array.isArray(data.codes) ? data.codes : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/invitation-codes/users', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        setUsers(Array.isArray(data.users) ? data.users : [])
      } catch {
        // ignore — UUID fallback input still works
      }
    })()
  }, [])

  const openGenerate = (type: 'DIRECT' | 'REFERRAL') => {
    setGenType(type)
    setReferrerUserId('')
    setNote('')
    setLastGenerated(null)
    setDialogOpen(true)
  }

  const handleGenerate = async () => {
    if (genType === 'REFERRAL' && !referrerUserId) {
      toast.error('Select the customer who will share this referral code')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/invitation-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: genType,
          referrerUserId: genType === 'REFERRAL' ? referrerUserId : null,
          note: note || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      const code = data.code?.code as string
      setLastGenerated(code)
      toast.success(`Generated ${code}`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate')
    } finally {
      setSaving(false)
    }
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Invitation codes</h1>
          <p className="text-muted-foreground text-sm">
            Required for registration. Each code works once. Direct = 6 digits. Referral = R + 5 digits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openGenerate('DIRECT')}>
            <Icon icon="solar:ticket-bold" className="mr-2 size-4" />
            Generate invitation
          </Button>
          <Button variant="outline" onClick={() => openGenerate('REFERRAL')}>
            <Icon icon="solar:users-group-rounded-bold" className="mr-2 size-4" />
            Generate referral
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'unused', 'used'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'unused' ? 'Unused' : 'Used'}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No invitation codes yet. Generate one for a new customer.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => copyCode(row.code)}
                      className="font-mono text-lg font-bold tracking-wider hover:text-primary"
                      title="Copy"
                    >
                      {row.code}
                    </button>
                    <Badge variant={row.type === 'REFERRAL' ? 'default' : 'secondary'}>
                      {row.type === 'REFERRAL' ? 'Referral' : 'Direct invite'}
                    </Badge>
                    <Badge variant={row.usedByUserId ? 'outline' : 'default'}>
                      {row.usedByUserId ? 'Used' : 'Unused'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDateTime(row.createdAt)}
                    {row.referrer && (
                      <>
                        {' '}
                        · For referrer: {row.referrer.name} ({row.referrer.email})
                      </>
                    )}
                    {row.usedBy && (
                      <>
                        {' '}
                        · Used by: {row.usedBy.name} ({row.usedBy.email})
                      </>
                    )}
                  </p>
                  {row.note && <p className="text-xs text-muted-foreground">Note: {row.note}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => copyCode(row.code)}>
                  <Icon icon="solar:copy-bold" className="mr-1 size-4" />
                  Copy
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {genType === 'DIRECT' ? 'Generate invitation code' : 'Generate referral code'}
            </DialogTitle>
            <DialogDescription>
              {genType === 'DIRECT'
                ? 'Give this 6-digit code to a new customer so they can register.'
                : 'Give this Rxxxxx code to an existing customer so they can invite one person.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {genType === 'REFERRAL' && (
              <div className="space-y-2">
                <Label>Customer who will refer someone</Label>
                {users.length > 0 ? (
                  <Select value={referrerUserId} onValueChange={setReferrerUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} — {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Paste user ID (UUID)"
                    value={referrerUserId}
                    onChange={(e) => setReferrerUserId(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. WhatsApp lead from CS"
                rows={2}
              />
            </div>

            {lastGenerated && (
              <div className="rounded-md border bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">New code</p>
                <p className="font-mono text-2xl font-bold tracking-widest">{lastGenerated}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => copyCode(lastGenerated)}
                >
                  Copy code
                </Button>
              </div>
            )}

            <Button className="w-full" onClick={handleGenerate} loading={saving}>
              {saving ? 'Generating…' : 'Generate code'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
