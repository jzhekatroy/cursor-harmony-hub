'use client'

import React, { useEffect, useState } from 'react'

interface TeamRow {
  id: string
  name: string
  teamNumber: string
  createdAt: string
  status: 'ACTIVE' | 'DISABLED'
  contactPerson: string | null
  email: string
  masterLimit: number
  mastersCount: number
  clientsCount: number
  bookingsCount: number
}

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<TeamRow[]>([])
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
      const url = `/api/superadmin/teams?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&t=${Date.now()}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Ошибка загрузки')
      }
      const data = await res.json()
      setTeams(data.teams || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, pageSize])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">БОГ‑админка: Команды</h1>
        </div>

        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-2">
          <input
            type="text"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={(e)=>{ if (e.key === 'Enter') { setPage(1); load() } }}
            placeholder="Поиск: номер B0XXXXXXX, email, название, контактное лицо"
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
                    <th className="px-3 py-2 text-left w-[18%]">Название</th>
                    <th className="px-3 py-2 text-left w-[12%]">Номер</th>
                    <th className="px-3 py-2 text-left w-[12%]">Дата регистрации</th>
                    <th className="px-3 py-2 text-left w-[10%]">Статус</th>
                    <th className="px-3 py-2 text-left w-[14%]">Контакт</th>
                    <th className="px-3 py-2 text-right w-[8%]">Сотр.</th>
                    <th className="px-3 py-2 text-right w-[8%]">Клиент.</th>
                    <th className="px-3 py-2 text-right w-[8%]">Брони</th>
                    <th className="px-3 py-2 text-right w-[10%]">Лимит маст.</th>
                    <th className="px-3 py-2 text-right w-[12%]">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teams.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{t.name}</td>
                      <td className="px-3 py-2">{t.teamNumber}</td>
                      <td className="px-3 py-2">{new Date(t.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-[2px] rounded-full text-xs ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{t.status === 'ACTIVE' ? 'Активна' : 'Отключена'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate">
                          <div className="font-medium">{t.contactPerson || '—'}</div>
                          <div className="text-xs text-gray-600">{t.email}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.mastersCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.clientsCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.bookingsCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.masterLimit}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        {t.status === 'ACTIVE' ? (
                          <button
                            onClick={async ()=>{
                              const reason = prompt('Причина отключения (необязательно):') || ''
                              try {
                                const token = localStorage.getItem('token')
                                const res = await fetch(`/api/superadmin/teams/${t.id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'DISABLED', reason })
                                })
                                if (!res.ok) throw new Error('Ошибка отключения')
                                await load(true)
                              } catch (e) {
                                alert('Не удалось отключить команду')
                              }
                            }}
                            className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
                          >Отключить</button>
                        ) : (
                          <button
                            onClick={async ()=>{
                              try {
                                const token = localStorage.getItem('token')
                                const res = await fetch(`/api/superadmin/teams/${t.id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'ACTIVE' })
                                })
                                if (!res.ok) throw new Error('Ошибка включения')
                                await load(true)
                              } catch (e) {
                                alert('Не удалось включить команду')
                              }
                            }}
                            className="px-2 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-50"
                          >Включить</button>
                        )}
                        <button
                          onClick={async ()=>{
                            try {
                              const token = localStorage.getItem('token')
                              const res = await fetch('/api/superadmin/impersonate', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ teamId: t.id })
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Ошибка')
                              // Сохраняем оригинальный токен для возврата
                              const original = localStorage.getItem('token')
                              if (original) sessionStorage.setItem('superadmin_original_token', original)
                              // Устанавливаем временный токен и переходим в админку
                              localStorage.setItem('token', data.token)
                              window.location.href = '/admin'
                            } catch (e) {
                              alert('Не удалось войти как админ команды')
                            }
                          }}
                          className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                        >Войти как админ</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-3 border-t border-gray-200 text-sm">
              <div>Всего: {total}</div>
              <div className="flex items-center gap-2">
                <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded disabled:opacity-50">◀</button>
                <div>{page} / {totalPages}</div>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-2 py-1 border rounded disabled:opacity-50">▶</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


