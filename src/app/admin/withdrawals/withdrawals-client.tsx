'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Withdrawal {
  id: string
  userId: string
  shopId?: string | null
  currency: string
  network: string | null
  address: string
  amount: number
  status: string
  rejectionReason?: string | null
  createdAt: string
  reviewedAt: string | null
  user: { id: string; name: string; email: string }
}

export function WithdrawalsClient() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('PENDING')
  const [updating, setUpdating] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      const url = filter ? `/api/admin/withdrawals?status=${filter}` : '/api/admin/withdrawals'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setWithdrawals(data.withdrawals || [])
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load withdrawals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
    setRejectingId(null)
    setRejectReason('')
  }, [filter])

  const handleApprove = async (id: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      toast.success('Withdrawal approved')
      fetchWithdrawals()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(null)
    }
  }

  const startReject = (w: Withdrawal) => {
    setRejectingId(w.id)
    setRejectReason('')
  }

  const cancelReject = () => {
    setRejectingId(null)
    setRejectReason('')
  }

  const handleRejectConfirm = async (id: string) => {
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Rejection reason is required')
      return
    }

    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      toast.success('Withdrawal rejected — seller will see your reason')
      setRejectingId(null)
      setRejectReason('')
      fetchWithdrawals()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(null)
    }
  }

  const handleHideFromAdmin = async (id: string) => {
    if (
      !confirm(
        'Remove this approved withdrawal from the admin list only? The user will still see it in their withdrawal records.'
      )
    ) {
      return
    }
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Hidden from admin — user can still see it')
      fetchWithdrawals()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(null)
    }
  }

  const statusColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800'
    if (status === 'REJECTED') return 'bg-red-100 text-red-800'
    return 'bg-amber-100 text-amber-800'
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-heading">Withdrawal Approvals</h1>
        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <Button
              key={s}
              variant={filter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-8">Loading...</div>
      ) : withdrawals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:upload-bold" className="size-16 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No {filter.toLowerCase()} withdrawals</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((w) => {
            const isRejecting = rejectingId === w.id
            return (
              <Card key={w.id} className={isRejecting ? 'ring-2 ring-destructive/40' : undefined}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {w.currency} {w.network ? `(${w.network})` : ''}
                      </p>
                      <p className="text-2xl font-bold mt-1">{Number(w.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono break-all max-w-xs">
                        {w.address}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {w.user?.name} · {w.user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(w.createdAt)}
                      </p>
                      {w.status === 'REJECTED' && (
                        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                          <p className="text-xs font-medium text-red-800">Rejection reason</p>
                          <p className="text-sm text-red-700 mt-0.5 whitespace-pre-wrap">
                            {w.rejectionReason?.trim() || 'No reason was recorded for this rejection.'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {w.shopId ? (
                        <Badge variant="secondary" className="bg-violet-100 text-violet-800">
                          Shop balance
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                          User balance
                        </Badge>
                      )}
                      <Badge className={statusColor(w.status)}>{w.status}</Badge>
                      {w.status === 'PENDING' && !isRejecting && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(w.id)}
                            disabled={updating === w.id}
                          >
                            {updating === w.id ? '...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startReject(w)}
                            disabled={updating === w.id}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {w.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/40 hover:bg-destructive/10"
                          onClick={() => handleHideFromAdmin(w.id)}
                          disabled={updating === w.id}
                          title="Hide from admin view (user still sees it)"
                        >
                          <Icon icon="solar:eye-closed-bold" className="size-4 mr-1.5" />
                          {updating === w.id ? '...' : 'Remove from admin'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {w.status === 'PENDING' && isRejecting && (
                    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-destructive">Reject withdrawal</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enter the reason below. The seller will see this on their Withdrawal Record
                          page.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reject-reason-${w.id}`}>Reason (required)</Label>
                        <Textarea
                          id={`reject-reason-${w.id}`}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. Incomplete wallet address / KYC documents required / Amount exceeds daily limit"
                          rows={4}
                          autoFocus
                          required
                        />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelReject}
                          disabled={updating === w.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectConfirm(w.id)}
                          disabled={updating === w.id || !rejectReason.trim()}
                        >
                          {updating === w.id ? 'Rejecting...' : 'Confirm rejection'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
