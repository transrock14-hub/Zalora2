'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  createdAt: string
  reviewedAt: string | null
  user: { id: string; name: string; email: string }
}

export function WithdrawalsClient() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('PENDING')
  const [updating, setUpdating] = useState<string | null>(null)

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

  const handleReject = async (id: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      toast.success('Withdrawal rejected')
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
    <div className="p-6 lg:p-8 max-w-4xl">
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
          {withdrawals.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{w.currency} {w.network ? `(${w.network})` : ''}</p>
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
                  </div>
                  <div className="flex items-center gap-2">
                    {w.shopId ? (
                      <Badge variant="secondary" className="bg-violet-100 text-violet-800">Shop balance</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-800">User balance</Badge>
                    )}
                    <Badge className={statusColor(w.status)}>{w.status}</Badge>
                    {w.status === 'PENDING' && (
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
                          onClick={() => handleReject(w.id)}
                          disabled={updating === w.id}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
