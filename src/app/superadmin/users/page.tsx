'use client'

import React, { useEffect, useState } from 'react'

interface UserRow {
  id: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MASTER'
  isActive: boolean
  lastLoginAt: string | null
  team?: { id: string; name: string; teamNumber: string }
}

export default function SuperAdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [q, setQ] = useState('')

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Нет токена авторизации')
      const url = `/api/superadmin/users?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&t=${Date.now()}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Ошибка загрузки')
      }
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, pageSize])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const changeRole = async (id: string, role: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/superadmin/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })
      if (!res.ok) {
        const data = await res.json().catch(()=>({}))
        alert(data.error || 'Ошибка смены роли')
        return
      }
      await load(true)
    } catch (e) {
      alert('Не удалось изменить роль')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">БОГ‑админка: Пользователи</h1>
        </div>

        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={(e)=>{ if (e.key === 'Enter') { setPage(1); load() } }}
            placeholder="Поиск: email или номер команды B0XXXXXXX"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button onClick={()=>{ setPage(1); load() }} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md">Искать</button>
        </div>

        {loading ? (
          <div className="mt-6 text-gray-600">Загрузка…</div>
        ) : error ? (
          <div className="mt-6 text-red-600">{error}</div>
        ) : (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-[28%]">Email</th>
                    <th className="px-3 py-2 text-left w-[16%]">Роль</th>
                    <th className="px-3 py-2 text-left w-[18%]">Команда</th>
                    <th className="px-3 py-2 text-left w-[18%]">Номер</th>
                    <th className="px-3 py-2 text-left w-[20%]">Последний вход</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">
                        {u.role === 'SUPER_ADMIN' ? (
                          <span className="text-xs px-2 py-[2px] rounded-full bg-purple-100 text-purple-800">SUPER_ADMIN</span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e)=>changeRole(u.id, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MASTER">MASTER</option>
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2">{u.team?.name || '—'}</td>
                      <td className="px-3 py-2">{u.team?.teamNumber || '—'}</td>
                      <td className="px-3 py-2">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ru-RU') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-3 border-t border-gray-200 text-sm">
              <div>Всего: {total}</div>
              <div className="flex items-center gap-2">
                <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded disabled:opacity-50">◀</button>
                <div>{page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
                <button disabled={page>=Math.max(1, Math.ceil(total / pageSize))} onClick={()=>setPage(p=>p+1)} className="px-2 py-1 border rounded disabled:opacity-50">▶</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


