'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { Search, Users, Trash2, CheckSquare, Square } from 'lucide-react'

interface ClientRow {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  telegramId: bigint | null
  telegramUsername: string | null
  telegramFirstName: string | null
  telegramLastName: string | null
  source: 'TELEGRAM_WEBAPP' | 'PUBLIC_PAGE' | 'ADMIN_CREATED'
  isBlocked: boolean
  telegramBlocked: boolean
  lastActivity: string | null
  lastBookingTime: string | null
  lastBookingStatus: string | null
  createdAt: string
  _count: {
    bookings: number
    actions: number
  }
}

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const toast = useToast()
  const [items, setItems] = useState<ClientRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'totalBookings' | 'lastBookingTime'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
      if (q.trim()) params.set('search', q.trim())
      const res = await fetch(`/api/clients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
      setItems(data.clients || [])
      setTotal(data.pagination?.total || 0)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка'
      setError(msg)
      toast.error(`Ошибка загрузки клиентов: ${msg}`)
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
    setSelectedClients(new Set()) // Сбрасываем выбор при поиске
    load()
  }

  // Функции для работы с выбором клиентов
  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedClients.size === sortedItems.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(sortedItems.map(c => c.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedClients.size === 0) return
    
    try {
      setDeleting(true)
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Токен авторизации отсутствует')
        return
      }

      const response = await fetch('/api/clients/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientIds: Array.from(selectedClients) })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка удаления')
      }

      toast.success(`Удалено клиентов: ${data.deletedClients.length}`)
      setSelectedClients(new Set())
      setShowDeleteConfirm(false)
      await load() // Перезагружаем список
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Неизвестная ошибка'
      toast.error(`Ошибка удаления: ${msg}`)
    } finally {
      setDeleting(false)
    }
  }

  const sortedItems = useMemo(() => {
    const copy = [...items]
    copy.sort((a, b) => {
      let av: any, bv: any
      switch (sortBy) {
        case 'name':
          av = `${a.lastName} ${a.firstName}`.trim().toLowerCase()
          bv = `${b.lastName} ${b.firstName}`.trim().toLowerCase()
          break
        case 'totalBookings':
          av = a._count.bookings; bv = b._count.bookings; break
        case 'lastBookingTime':
          av = a.lastBookingTime ? new Date(a.lastBookingTime).getTime() : 0
          bv = b.lastBookingTime ? new Date(b.lastBookingTime).getTime() : 0
          break
        default:
          av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime()
      }
      const res = av < bv ? -1 : av > bv ? 1 : 0
      return sortOrder === 'asc' ? res : -res
    })
    return copy
  }, [items, sortBy, sortOrder])

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortOrder('asc') }
  }

  const mark = (text: string) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.trim().toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-gray-900 px-0.5 rounded-sm">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    )
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

      {/* Панель управления выбором */}
      {sortedItems.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-100"
            >
              {selectedClients.size === sortedItems.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              {selectedClients.size === sortedItems.length ? 'Снять все' : 'Выбрать все'}
            </button>
            
            {selectedClients.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Выбрано: {selectedClients.size} из {sortedItems.length}
                </span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить выбранных
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      <div className="overflow-x-auto bg-white rounded-md shadow-sm border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-12 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedClients.size === sortedItems.length && sortedItems.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('name')}>Клиент {sortBy === 'name' && (<span className="text-gray-400">{sortOrder === 'asc' ? '▲' : '▼'}</span>)}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Контакты</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('totalBookings')}>Всего записей {sortBy === 'totalBookings' && (<span className="text-gray-400">{sortOrder === 'asc' ? '▲' : '▼'}</span>)}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer select-none" onClick={() => toggleSort('lastBookingTime')}>Последняя запись {sortBy === 'lastBookingTime' && (<span className="text-gray-400">{sortOrder === 'asc' ? '▲' : '▼'}</span>)}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div><div className="h-3 bg-gray-100 rounded w-24 mt-2 animate-pulse"></div></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div><div className="h-3 bg-gray-100 rounded w-24 mt-2 animate-pulse"></div></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div></td>
                  <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div></td>
                  <td className="px-3 py-3"><div className="h-8 bg-gray-100 rounded w-16 animate-pulse"></div></td>
                </tr>
              ))
            ) : sortedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-gray-600">
                  <div className="space-y-2">
                    <div>Ничего не найдено</div>
                    {!q && (
                      <a href="/admin" className="inline-block px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Создать запись</a>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedItems.map((c) => (
                <tr key={c.id} className={`border-t hover:bg-gray-50 ${selectedClients.has(c.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedClients.has(c.id)}
                      onChange={() => toggleClientSelection(c.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {mark(([c.lastName, c.firstName].filter(Boolean).join(' ') || 'Без имени'))}
                      {c.isBlocked && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Заблокирован</span>}
                      {c.telegramBlocked && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Telegram заблокирован</span>}
                    </div>
                    <div className="text-gray-500 text-xs">
                      Создан: {new Date(c.createdAt).toLocaleDateString('ru-RU')} · 
                      {c.source === 'TELEGRAM_WEBAPP' && ' Telegram'}
                      {c.source === 'PUBLIC_PAGE' && ' Публичная страница'}
                      {c.source === 'ADMIN_CREATED' && ' Админ-панель'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <div>{mark(c.phone || '—')}</div>
                    <div className="text-gray-500 text-xs">
                      {mark(c.email || '—')} 
                      {c.telegramUsername && <> · @{mark(c.telegramUsername)}</>}
                    </div>
                  </td>
                    <td className="px-3 py-2">{c._count.bookings}</td>
                  <td className="px-3 py-2">
                    {c.lastBookingTime ? (
                      <div>
                        <div className="text-sm">{new Date(c.lastBookingTime).toLocaleString('ru-RU')}</div>
                        {c.lastBookingStatus && (
                          <div className="text-xs text-gray-500">
                            {c.lastBookingStatus === 'COMPLETED' && 'Завершена'}
                            {c.lastBookingStatus === 'CONFIRMED' && 'Подтверждена'}
                            {c.lastBookingStatus === 'NEW' && 'Новая'}
                            {c.lastBookingStatus === 'CANCELLED_BY_CLIENT' && 'Отменена клиентом'}
                            {c.lastBookingStatus === 'CANCELLED_BY_SALON' && 'Отменена салоном'}
                            {c.lastBookingStatus === 'NO_SHOW' && 'Не пришел'}
                          </div>
                        )}
                      </div>
                    ) : '—'}
                  </td>
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

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Подтверждение удаления</h3>
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите удалить {selectedClients.size} клиент{selectedClients.size === 1 ? 'а' : selectedClients.size < 5 ? 'ов' : 'ов'}?
              <br />
              <span className="text-red-600 font-medium">Это действие нельзя отменить!</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [tab, setTab] = useState<'profile' | 'analytics'>('profile')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const toast = useToast()

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

  useEffect(() => { loadClient() }, [id])

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex" onClick={onClose}>
      <div className="ml-auto h-full w-full max-w-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Клиент</div>
          <button onClick={onClose} className="px-2 py-1.5 border rounded">Закрыть</button>
        </div>

        <div className="px-4 pt-3 flex gap-2 border-b">
          <button onClick={() => setTab('profile')} className={`px-3 py-2 border-b-2 -mb-px ${tab==='profile'? 'border-blue-600 text-blue-600':'border-transparent text-gray-600'}`}>Профиль</button>
          <button onClick={() => setTab('analytics')} className={`px-3 py-2 border-b-2 -mb-px ${tab==='analytics'? 'border-blue-600 text-blue-600':'border-transparent text-gray-600'}`}>Аналитика</button>
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
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            firstName: data.firstName,
                            lastName: data.lastName,
                            phone: data.phone,
                            email: data.email,
                            telegramId: data.telegramId,
                            telegramUsername: data.telegramUsername,
                            telegramFirstName: data.telegramFirstName,
                            telegramLastName: data.telegramLastName,
                            preferredLanguage: data.preferredLanguage,
                            isBlocked: data.isBlocked
                          })
                        })
                        const json = await res.json()
                        if (!res.ok) throw new Error(json.error || 'Не удалось сохранить')
                        await loadClient()
                        setSuccess('Данные клиента обновлены')
                        toast.success('Данные клиента сохранены')
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
                        setError(msg)
                        toast.error(`Ошибка сохранения: ${msg}`)
                      } finally {
                        setLoading(false)
                      }
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Имя</label>
                        <input value={data.firstName || ''} onChange={(e) => setData((d: any) => ({...d, firstName: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Фамилия</label>
                        <input value={data.lastName || ''} onChange={(e) => setData((d: any) => ({...d, lastName: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Телефон</label>
                        <input value={data.phone || ''} onChange={(e) => setData((d: any) => ({...d, phone: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Email</label>
                        <input type="email" value={data.email || ''} onChange={(e) => setData((d: any) => ({...d, email: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Telegram данные</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Telegram ID</label>
                          <input value={data.telegramId || ''} onChange={(e) => setData((d: any) => ({...d, telegramId: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Username</label>
                          <input value={data.telegramUsername || ''} onChange={(e) => setData((d: any) => ({...d, telegramUsername: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]" />
                        </div>
                      </div>
                    </div>


                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Настройки</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Язык</label>
                          <select value={data.preferredLanguage || 'ru'} onChange={(e) => setData((d: any) => ({...d, preferredLanguage: e.target.value}))} className="w-full border rounded px-3 py-2 min-h-[44px]">
                            <option value="ru">Русский</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center">
                            <input type="checkbox" checked={data.isBlocked || false} onChange={(e) => setData((d: any) => ({...d, isBlocked: e.target.checked}))} className="mr-2" />
                            <span className="text-sm text-gray-600">Заблокирован</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={loading}>Сохранить</button>
                      <div className="text-sm text-gray-500">Создан: {new Date(data.createdAt).toLocaleString('ru-RU')}</div>
                    </div>
                  </form>
                </div>
              )}

              {tab === 'analytics' && (
                <ClientAnalytics clientId={id} baseMetrics={data} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ClientAnalytics({ clientId, baseMetrics }: { clientId: string; baseMetrics: any }) {
  const [mode, setMode] = useState<'all' | 'range'>('all')
  const [fromStr, setFromStr] = useState('')
  const [toStr, setToStr] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  const statusLabel = (s: string) => ({
    COMPLETED: 'Завершено',
    NEW: 'Создана',
    CONFIRMED: 'Подтверждена',
    NO_SHOW: 'Не пришёл',
    CANCELLED_BY_CLIENT: 'Отменена клиентом',
    CANCELLED_BY_SALON: 'Отменена салоном'
  } as any)[s] || s

  const computeFromBookings = (bookings: any[]) => {
    const res = {
      counts: { COMPLETED: 0, PLANNED: 0, NO_SHOW: 0, CANCELLED_BY_CLIENT: 0, CANCELLED_BY_SALON: 0 },
      revenue: { completed: 0, planned: 0, lost: 0 }
    }
    for (const b of bookings) {
      const price = Number(b.totalPrice) || 0
      switch (b.status) {
        case 'COMPLETED':
          res.counts.COMPLETED++; res.revenue.completed += price; break
        case 'NEW':
        case 'CONFIRMED':
          res.counts.PLANNED++; res.revenue.planned += price; break
        case 'NO_SHOW':
          res.counts.NO_SHOW++; res.revenue.lost += price; break
        case 'CANCELLED_BY_CLIENT':
          res.counts.CANCELLED_BY_CLIENT++; res.revenue.lost += price; break
        case 'CANCELLED_BY_SALON':
          res.counts.CANCELLED_BY_SALON++; res.revenue.lost += price; break
      }
    }
    return res
  }

  const loadRange = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token'); if (!token) return
      const params = new URLSearchParams({ clientId })
      if (fromStr) params.set('from', new Date(fromStr + 'T00:00:00').toISOString())
      if (toStr) params.set('to', new Date(toStr + 'T23:59:59').toISOString())
      const res = await fetch(`/api/bookings?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'Ошибка загрузки')
      setSummary(computeFromBookings(json.bookings || []))
    } finally { setLoading(false) }
  }

  // Вычисляем метрики на основе бронирований клиента
  const computeMetrics = (bookings: any[]) => {
    const res = {
      counts: { COMPLETED: 0, PLANNED: 0, NO_SHOW: 0, CANCELLED_BY_CLIENT: 0, CANCELLED_BY_SALON: 0 },
      revenue: { completed: 0, planned: 0, lost: 0 }
    }
    for (const b of bookings) {
      const price = Number(b.totalPrice) || 0
      switch (b.status) {
        case 'COMPLETED':
          res.counts.COMPLETED++; res.revenue.completed += price; break
        case 'NEW':
        case 'CONFIRMED':
          res.counts.PLANNED++; res.revenue.planned += price; break
        case 'NO_SHOW':
          res.counts.NO_SHOW++; res.revenue.lost += price; break
        case 'CANCELLED_BY_CLIENT':
          res.counts.CANCELLED_BY_CLIENT++; res.revenue.lost += price; break
        case 'CANCELLED_BY_SALON':
          res.counts.CANCELLED_BY_SALON++; res.revenue.lost += price; break
      }
    }
    return res
  }

  const computedMetrics = computeMetrics(baseMetrics?.bookings || [])

  const current = mode === 'all' ? {
    counts: {
      COMPLETED: computedMetrics?.counts?.COMPLETED || 0,
      PLANNED: computedMetrics?.counts?.PLANNED || 0,
      NO_SHOW: computedMetrics?.counts?.NO_SHOW || 0,
      CANCELLED_BY_CLIENT: computedMetrics?.counts?.CANCELLED_BY_CLIENT || 0,
      CANCELLED_BY_SALON: computedMetrics?.counts?.CANCELLED_BY_SALON || 0
    },
    revenue: {
      completed: computedMetrics?.revenue?.completed || 0,
      planned: computedMetrics?.revenue?.planned || 0,
      lost: computedMetrics?.revenue?.lost || 0
    }
  } : summary

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e)=>{ e.preventDefault(); if (mode==='range') loadRange() }}>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Период:</label>
          <select value={mode} onChange={(e)=>setMode(e.target.value as any)} className="border rounded px-2 py-1.5 text-sm">
            <option value="all">За всё время</option>
            <option value="range">Диапазон</option>
          </select>
        </div>
        {mode==='range' && (
          <>
            <div>
              <label className="block text-sm text-gray-600 mb-1">С даты</label>
              <input type="date" value={fromStr} onChange={(e)=>setFromStr(e.target.value)} className="border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">По дату</label>
              <input type="date" value={toStr} onChange={(e)=>setToStr(e.target.value)} className="border rounded px-2 py-1.5" />
            </div>
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded text-sm" disabled={loading}>{loading ? 'Загрузка…' : 'Применить'}</button>
          </>
        )}
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 border rounded">
          <div className="text-sm text-gray-600 mb-1">Завершено</div>
          <div className="text-lg font-semibold">{mode==='all' ? (computedMetrics?.counts?.COMPLETED || 0) : (current?.counts?.COMPLETED || 0)}</div>
          <div className="text-sm text-gray-600">{(mode==='all' ? computedMetrics?.revenue?.completed : current?.revenue?.completed || 0)?.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="p-3 border rounded">
          <div className="text-sm text-gray-600 mb-1">Запланировано</div>
          <div className="text-lg font-semibold">{mode==='all' ? (computedMetrics?.counts?.PLANNED || 0) : (current?.counts?.PLANNED || 0)}</div>
          <div className="text-sm text-gray-600">{(mode==='all' ? computedMetrics?.revenue?.planned : current?.revenue?.planned || 0)?.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="p-3 border rounded">
          <div className="text-sm text-gray-600 mb-1">Не пришёл</div>
          <div className="text-lg font-semibold">{mode==='all' ? (computedMetrics?.counts?.NO_SHOW || 0) : (current?.counts?.NO_SHOW || 0)}</div>
        </div>
        <div className="p-3 border rounded">
          <div className="text-sm text-gray-600 mb-1">Отменено клиентом</div>
          <div className="text-lg font-semibold">{mode==='all' ? (computedMetrics?.counts?.CANCELLED_BY_CLIENT || 0) : (current?.counts?.CANCELLED_BY_CLIENT || 0)}</div>
        </div>
        <div className="p-3 border rounded">
          <div className="text-sm text-gray-600 mb-1">Отменено салоном</div>
          <div className="text-lg font-semibold">{mode==='all' ? (computedMetrics?.counts?.CANCELLED_BY_SALON || 0) : (current?.counts?.CANCELLED_BY_SALON || 0)}</div>
        </div>
        <div className="p-3 border rounded">
          <div className="text-sm text-gray-600 mb-1">Упущенная выручка</div>
          <div className="text-lg font-semibold">{(mode==='all' ? computedMetrics?.revenue?.lost : current?.revenue?.lost || 0)?.toLocaleString('ru-RU')} ₽</div>
        </div>
      </div>
    </div>
  )
}