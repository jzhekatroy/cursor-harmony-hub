'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface LogItem {
  id: string
  email: string
  success: boolean
  failureReason?: string | null
  ip?: string | null
  userAgent?: string | null
  createdAt: string
  user?: { id: string; email: string; role: string } | null
  team?: { id: string; teamNumber: string; name: string } | null
}

export default function LoginLogsPage() {
  const router = useRouter()
  const [tokenChecked, setTokenChecked] = useState(false)
  const [logs, setLogs] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [teamNumber, setTeamNumber] = useState('')
  const [success, setSuccess] = useState<'all' | 'true' | 'false'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      router.push('/login')
      return
    }
    setTokenChecked(true)
  }, [router])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const fetchData = async () => {
    const token = localStorage.getItem('token') || ''
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (teamNumber) params.set('teamNumber', teamNumber)
      if (success !== 'all') params.set('success', success)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/superadmin/login-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error('Ошибка загрузки журнала')
      }
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!tokenChecked) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenChecked, page, pageSize])

  const onSearch = () => {
    setPage(1)
    fetchData()
  }

  if (!tokenChecked) return null

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Журнал входов</h1>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <div>
          <label className="text-sm text-gray-600">Email</label>
          <input className="border rounded px-2 py-1 w-full" value={q} onChange={e => setQ(e.target.value)} placeholder="email содержит..." />
        </div>
        <div>
          <label className="text-sm text-gray-600">Номер команды</label>
          <input className="border rounded px-2 py-1 w-full" value={teamNumber} onChange={e => setTeamNumber(e.target.value)} placeholder="B0XXXXXXX" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Статус</label>
          <select className="border rounded px-2 py-1 w-full" value={success} onChange={e => setSuccess(e.target.value as any)}>
            <option value="all">Все</option>
            <option value="true">Успешные</option>
            <option value="false">Неуспешные</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">С</label>
          <input type="date" className="border rounded px-2 py-1 w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-gray-600">По</label>
          <input type="date" className="border rounded px-2 py-1 w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={onSearch} disabled={loading}>Искать</button>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Дата/время</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Статус</th>
              <th className="text-left px-3 py-2">Команда</th>
              <th className="text-left px-3 py-2">IP</th>
              <th className="text-left px-3 py-2">User Agent</th>
              <th className="text-left px-3 py-2">Причина ошибки</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(item => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{item.email}</td>
                <td className="px-3 py-2">
                  {item.success ? <span className="text-green-600">успех</span> : <span className="text-red-600">ошибка</span>}
                </td>
                <td className="px-3 py-2">{item.team ? `${item.team.teamNumber} • ${item.team.name}` : '-'}</td>
                <td className="px-3 py-2">{item.ip || '-'}</td>
                <td className="px-3 py-2 truncate max-w-[300px]" title={item.userAgent || ''}>{item.userAgent || '-'}</td>
                <td className="px-3 py-2">{item.failureReason || '-'}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <div className="text-sm text-gray-600">Всего: {total}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded" disabled={page<=1 || loading} onClick={() => setPage(p => Math.max(1, p-1))}>Назад</button>
          <span className="text-sm">{page} / {totalPages}</span>
          <button className="px-3 py-1 border rounded" disabled={page>=totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Вперёд</button>
          <select className="border rounded px-2 py-1" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>
            {[10,20,50,100].map(s => <option key={s} value={s}>{s}/стр</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}


