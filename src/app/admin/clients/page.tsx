'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Users } from 'lucide-react'

interface ClientRow {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  telegram: string
  totalBookings: number
  lastActivity: string | null
  createdAt: string
}

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ClientRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Токен авторизации отсутствует')
        return
      }
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
      setItems(data.clients || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  // Авто-открытие карточки через ?id=
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) setSelectedId(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gray-600" />
        <h1 className="text-xl font-semibold">Клиенты</h1>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск: имя, телефон, email, Telegram"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
        </div>
        <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 min-h-[44px]">Искать</button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      <div className="overflow-x-auto bg-white rounded-md shadow-sm border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Клиент</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Контакты</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Всего записей</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Последняя активность</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Загрузка…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Ничего не найдено</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{[c.lastName, c.firstName].filter(Boolean).join(' ') || 'Без имени'}</div>
                    <div className="text-gray-500 text-xs">Создан: {new Date(c.createdAt).toLocaleDateString('ru-RU')}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <div>{c.phone || '—'}</div>
                    <div className="text-gray-500 text-xs">{c.email || '—'} {c.telegram ? `· @${c.telegram}` : ''}</div>
                  </td>
                    <td className="px-3 py-2">{c.totalBookings}</td>
                  <td className="px-3 py-2">{c.lastActivity ? new Date(c.lastActivity).toLocaleString('ru-RU') : '—'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setSelectedId(c.id)} className="px-3 py-1.5 border rounded hover:bg-gray-50">Открыть</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">Всего: {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border rounded disabled:opacity-50">Назад</button>
          <div className="text-sm">{page} / {totalPages}</div>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border rounded disabled:opacity-50">Вперед</button>
          <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))} className="ml-2 border rounded px-2 py-1.5">
            {[10, 20, 30, 50].map(s => <option key={s} value={s}>{s}/стр</option>)}
          </select>
        </div>
      </div>

      {/* Боковая карточка клиента */}
      {selectedId && <ClientDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function ClientDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [tab, setTab] = useState<'profile' | 'bookings' | 'events' | 'analytics'>('profile')
  const [data, setData] = useState<any>(null)
  const [events, setEvents] = useState<any>({ total: 0, events: [], page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadClient = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Ошибка загрузки клиента')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async (page = 1) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`/api/clients/${id}/events?page=${page}&pageSize=20`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Ошибка загрузки событий')
      setEvents(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    }
  }

  useEffect(() => { loadClient(); loadEvents(1) }, [id])

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex" onClick={onClose}>
      <div className="ml-auto h-full w-full max-w-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Клиент</div>
          <button onClick={onClose} className="px-2 py-1.5 border rounded">Закрыть</button>
        </div>

        <div className="px-4 pt-3 flex gap-2 border-b">
          {([['profile','Профиль'],['bookings','Брони'],['events','События'],['analytics','Аналитика']] as const).map(([key,label]) => (
            <button key={key} onClick={() => setTab(key as any)} className={`px-3 py-2 border-b-2 -mb-px ${tab===key? 'border-blue-600 text-blue-600':'border-transparent text-gray-600'}`}>{label}</button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-130px)]">
          {loading && <div className="text-gray-500">Загрузка…</div>}
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}
          {!loading && data && (
            <>
              {tab === 'profile' && (
                <div className="space-y-2">
                  {success && (
                    <div className="mb-2 p-3 bg-green-50 text-green-700 border border-green-200 rounded">{success}</div>
                  )}
                  <form
                    className="space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      try {
                        setLoading(true)
                        setError(null)
                        setSuccess(null)
                        const token = localStorage.getItem('token')
                        if (!token) return
                        const res = await fetch(`/api/clients/${id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            firstName: data.firstName,
                            lastName: data.lastName,
                            phone: data.phone,
                            email: data.email,
                            telegram: data.telegram,
                            address: data.address,
                          })
                        })
                        const json = await res.json()
                        if (!res.ok) throw new Error(json.error || 'Не удалось сохранить')
                        await loadClient()
                        setSuccess('Данные клиента обновлены')
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
                      } finally {
                        setLoading(false)
                      }
                    }}
                  >
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Имя</label>
                      <input value={data.firstName || ''} onChange={(e) => setData((d: any) => ({...d, firstName: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Фамилия</label>
                      <input value={data.lastName || ''} onChange={(e) => setData((d: any) => ({...d, lastName: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Телефон</label>
                      <input value={data.phone || ''} onChange={(e) => setData((d: any) => ({...d, phone: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Email</label>
                      <input type="email" value={data.email || ''} onChange={(e) => setData((d: any) => ({...d, email: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" required />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Telegram</label>
                      <input value={data.telegram || ''} onChange={(e) => setData((d: any) => ({...d, telegram: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Адрес</label>
                      <input value={data.address || ''} onChange={(e) => setData((d: any) => ({...d, address: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={loading}>Сохранить</button>
                      <div className="text-sm text-gray-500">Создан: {new Date(data.createdAt).toLocaleString('ru-RU')}</div>
                    </div>
                  </form>
                </div>
              )}

              {tab === 'bookings' && (
                <div className="space-y-3">
                  {data.recentBookings && data.recentBookings.length > 0 ? (
                    data.recentBookings.map((b: any) => (
                      <div key={b.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">#{b.bookingNumber}</div>
                          <div className="text-sm text-gray-600">{new Date(b.startTime).toLocaleString('ru-RU')}</div>
                        </div>
                        <div className="text-sm text-gray-700">Мастер: {b.master.firstName} {b.master.lastName}</div>
                        <div className="text-sm text-gray-700">Статус: {b.status}</div>
                        <div className="text-sm text-gray-700">Сумма: {Number(b.totalPrice).toLocaleString('ru-RU')} ₽</div>
                        <div className="text-sm text-gray-500">Услуги: {b.services.map((s: any) => s.name).join(', ')}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">Пока нет данных</div>
                  )}
                </div>
              )}

              {tab === 'events' && (
                <div className="space-y-3">
                  {(events.events || []).map((ev: any) => {
                    const type = ev.type as string
                    const typeMap: Record<string, { label: string; chip: string }> = {
                      'page_open': { label: 'Открытие страницы', chip: 'bg-gray-100 text-gray-700' },
                      'booking_created': { label: 'Создана бронь', chip: 'bg-yellow-100 text-yellow-800' },
                      'booking_rescheduled': { label: 'Перенос брони', chip: 'bg-blue-100 text-blue-800' },
                      'booking_cancelled': { label: 'Отмена брони', chip: 'bg-red-100 text-red-800' },
                      'booking_no_show': { label: 'Клиент не пришел', chip: 'bg-orange-100 text-orange-800' },
                      'booking_completed': { label: 'Бронь завершена', chip: 'bg-gray-100 text-gray-800' },
                    }
                    const entry = typeMap[type] || { label: type, chip: 'bg-gray-100 text-gray-700' }
                    const meta = ev.metadata || {}
                    const sourceMap: Record<string, string> = {
                      public: 'Публичная страница',
                      admin: 'Админка',
                      webapp: 'Telegram WebApp',
                      system: 'Система'
                    }
                    const sourceLabel = sourceMap[(ev.source as string) || ''] || ev.source || '—'
                    return (
                      <div key={ev.id} className="border rounded p-3">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div>{new Date(ev.createdAt).toLocaleString('ru-RU')}</div>
                          <span className={`inline-flex px-2 py-[2px] text-[10px] font-medium rounded-full ${entry.chip}`}>{entry.label}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-800">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                            <div>Источник: <span className="text-gray-900">{sourceLabel}</span></div>
                            {meta.timezone && (
                              <div>Часовой пояс: <span className="text-gray-900">{meta.timezone}</span></div>
                            )}
                          </div>
                          {type.startsWith('booking_') && (
                            <div className="space-y-1">
                              {meta.bookingId && (
                                <div>Бронь: <span className="font-mono text-xs">{meta.bookingId}</span></div>
                              )}
                              {meta.masterId && (
                                <div>Мастер: <span className="font-mono text-xs">{meta.masterId}</span></div>
                              )}
                              {Array.isArray(meta.serviceIds) && meta.serviceIds.length > 0 && (
                                <div>Услуги: <span className="font-mono text-xs">{meta.serviceIds.join(', ')}</span></div>
                              )}
                              {type === 'booking_cancelled' && meta.cancelledBy && (
                                <div>Отменено: <span className="text-gray-900">{meta.cancelledBy === 'salon' ? 'салоном' : meta.cancelledBy === 'client' ? 'клиентом' : meta.cancelledBy}</span></div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">Найдено: {events.total}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => loadEvents(Math.max(1, (events.page || 1) - 1))} className="px-3 py-1.5 border rounded" disabled={(events.page || 1) <= 1}>Назад</button>
                      <div className="text-sm">{events.page || 1}</div>
                      <button onClick={() => loadEvents((events.page || 1) + 1)} className="px-3 py-1.5 border rounded" disabled={(events.page || 1) * (events.pageSize || 20) >= (events.total || 0)}>Вперед</button>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'analytics' && (
                <div className="space-y-2">
                  <div className="text-gray-700">Всего записей: {data.metrics?.counts?.completed + data.metrics?.counts?.planned + data.metrics?.counts?.lost}</div>
                  <div className="text-gray-700">Завершено: {data.metrics?.counts?.completed} · {Number(data.metrics?.revenue?.completed || 0).toLocaleString('ru-RU')} ₽</div>
                  <div className="text-gray-700">Запланировано: {data.metrics?.counts?.planned} · {Number(data.metrics?.revenue?.planned || 0).toLocaleString('ru-RU')} ₽</div>
                  <div className="text-gray-700">Упущено: {data.metrics?.counts?.lost} · {Number(data.metrics?.revenue?.lost || 0).toLocaleString('ru-RU')} ₽</div>
                  <div className="text-gray-500 text-sm">Последняя запись: {data.metrics?.lastBookingAt ? new Date(data.metrics.lastBookingAt).toLocaleString('ru-RU') : '—'}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}