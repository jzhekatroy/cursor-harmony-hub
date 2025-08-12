'use client'

import React, { useState, useEffect } from 'react'
import { createDateInSalonTimezone } from '@/lib/timezone'
import { Calendar, Clock, User, Phone, Mail, AlertCircle, Search, Filter, Download, MessageCircle, X, Edit, ChevronDown, ChevronUp, Save } from 'lucide-react'
import Link from 'next/link'
import { formatTimeForAdmin } from '@/lib/timezone'
// Removed calendar view on bookings page

interface BookingService {
  name: string
  duration: number
  price: number
}

interface Booking {
  id: string
  bookingNumber: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  notes?: string
  client: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    telegram?: string
  }
  master: {
    id: string
    firstName: string
    lastName: string
  }
  services: BookingService[]
}

interface Master {
  id: string
  firstName: string
  lastName: string
}

const statusColors = {
  'NEW': 'bg-yellow-100 text-yellow-800',
  'CONFIRMED': 'bg-blue-100 text-blue-800',
  'COMPLETED': 'bg-green-100 text-green-800',
  'NO_SHOW': 'bg-orange-100 text-orange-800',
  'CANCELLED_BY_CLIENT': 'bg-red-100 text-red-800',
  'CANCELLED_BY_SALON': 'bg-gray-100 text-gray-800'
}

const statusNames = {
  'NEW': 'Создана',
  'CONFIRMED': 'Подтверждена',
  'COMPLETED': 'Завершена',
  'NO_SHOW': 'Не пришел',
  'CANCELLED_BY_CLIENT': 'Отменена клиентом',
  'CANCELLED_BY_SALON': 'Отменена администратором'
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [masterFilter, setMasterFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'master' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Новое состояние для временной зоны салона
  const [salonTimezone, setSalonTimezone] = useState<string>('Europe/Moscow')
  
  // Состояние для отслеживания отмены бронирования
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)

  // Состояние для раскрываемых бронирований
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())
  const [editingBookings, setEditingBookings] = useState<Set<string>>(new Set())
  const [editForms, setEditForms] = useState<Record<string, any>>({})
  const [overlaps, setOverlaps] = useState<Record<string, boolean>>({})

  // На странице бронирований оставляем только список (календарь убран)

  useEffect(() => {
    loadData()
  }, [statusFilter, masterFilter, sortBy, sortOrder])

  // Загрузка данных
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }

      // Загружаем настройки команды для получения временной зоны
      const settingsResponse = await fetch('/api/team/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSalonTimezone(settingsData.settings.timezone || 'Europe/Moscow')
      }

      // Загружаем бронирования и мастеров параллельно
      const [bookingsResponse, mastersResponse] = await Promise.all([
        fetch('/api/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/masters', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        const normalized = (bookingsData.bookings || []).map((b: any) => ({
          ...b,
          services: (b.services || []).map((bs: any) => ({
            name: bs.service?.name ?? bs.name,
            duration: bs.service?.duration ?? bs.duration ?? 0,
            price: bs.service?.price ?? bs.price ?? 0
          })),
          client: {
            ...b.client,
            firstName: b.client?.firstName || b.client?.name || '',
            lastName: b.client?.lastName || ''
          }
        }))
        setBookings(normalized)
      } else {
        const errorData = await bookingsResponse.json()
        setError(`Ошибка загрузки бронирований: ${errorData.error || 'Неизвестная ошибка'}`)
      }

      if (mastersResponse.ok) {
        const mastersData = await mastersResponse.json()
        setMasters(mastersData.masters || mastersData)
      } else {
        const errorData = await mastersResponse.json()
        setError(`Ошибка загрузки мастеров: ${errorData.error || 'Неизвестная ошибка'}`)
      }

    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  // Отмена/"Не пришёл" с подтверждением
  const cancelBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId)
      if (!booking) return
      const isFinished = new Date(booking.endTime).getTime() <= Date.now()
      const confirmText = isFinished ? 'Отметить запись как «Не пришёл»?' : 'Отменить эту запись?'
      if (!confirm(confirmText)) return

      setCancellingBooking(bookingId)
      const token = localStorage.getItem('token')
      const endpoint = isFinished ? `/api/bookings/${bookingId}/no-show` : `/api/bookings/${bookingId}/cancel`
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })

      if (response.ok) {
        // Обновляем список бронирований
        await loadData()
      } else {
        const errorData = await response.json()
        alert(`Ошибка: ${errorData.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Ошибка изменения статуса:', error)
      alert('Произошла ошибка при изменении статуса')
    } finally {
      setCancellingBooking(null)
    }
  }

  // Переключение раскрытия брони
  const toggleExpanded = (bookingId: string) => {
    const newExpanded = new Set(expandedBookings)
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId)
    } else {
      newExpanded.add(bookingId)
    }
    setExpandedBookings(newExpanded)
  }

  // Начало редактирования
  const toLocalDateTimeInputValue = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const startEditing = (booking: Booking) => {
    setEditingBookings(prev => new Set(prev).add(booking.id))
    setEditForms(prev => ({
      ...prev,
      [booking.id]: {
        startTime: toLocalDateTimeInputValue(new Date(booking.startTime)),
        masterId: booking.master.id,
        duration: booking.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0,
        totalPrice: booking.totalPrice,
        notes: booking.notes || ''
      }
    }))
  }

  // Отмена редактирования
  const cancelEditing = (bookingId: string) => {
    setEditingBookings(prev => {
      const newSet = new Set(prev)
      newSet.delete(bookingId)
      return newSet
    })
    setEditForms(prev => {
      const newForms = { ...prev }
      delete newForms[bookingId]
      return newForms
    })
  }

  // Сохранение изменений
  const saveChanges = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('token')
      const formData = editForms[bookingId]

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Обновляем список бронирований
        await loadData()
        // Выходим из режима редактирования
        cancelEditing(bookingId)
      } else {
        const errorData = await response.json()
        alert(`Ошибка сохранения: ${errorData.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Произошла ошибка при сохранении')
    }
  }

  // Обновление формы редактирования
  const updateEditForm = (bookingId: string, field: string, value: any) => {
    setEditForms(prev => ({
      ...prev,
      [bookingId]: { ...prev[bookingId], [field]: value }
    }))
  }

  // Проверка пересечений при изменении startTime/masterId/duration
  useEffect(() => {
    const tz = salonTimezone || 'Europe/Moscow'
    const newOverlaps: Record<string, boolean> = {}
    bookings.forEach(b => {
      if (!editingBookings.has(b.id)) return
      const form = editForms[b.id]
      if (!form?.startTime || !form?.masterId) return
      try {
        const [datePart, timePart] = form.startTime.split('T')
        const [y, m, d] = datePart.split('-').map(Number)
        const [hh, mm] = timePart.split(':').map(Number)
        const utcStart = createDateInSalonTimezone(y, m, d, hh, mm, tz)
        const duration = Number(form.duration) || 0
        const utcEnd = new Date(utcStart.getTime() + duration * 60 * 1000)
        const conflict = bookings.some(other => {
          if (other.id === b.id) return false
          if (other.master.id !== form.masterId) return false
          if (!['NEW', 'CONFIRMED'].includes(other.status)) return false
          const oStart = new Date(other.startTime)
          const oEnd = new Date(other.endTime)
          return utcStart < oEnd && utcEnd > oStart
        })
        newOverlaps[b.id] = conflict
      } catch {
        newOverlaps[b.id] = false
      }
    })
    setOverlaps(newOverlaps)
  }, [editForms, editingBookings, bookings, salonTimezone])

  // Удалён обработчик клика календаря (календарь скрыт)

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return {
      date: date.toLocaleDateString('ru-RU'),
      time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }
  }

  // Фильтрация и сортировка
  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    const matchesMaster = masterFilter === 'all' || booking.master.id === masterFilter
    const matchesSearch = searchTerm === '' || 
      booking.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${booking.client.firstName} ${booking.client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${booking.master.firstName} ${booking.master.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesMaster && matchesSearch
  })

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let aValue: any, bValue: any

    switch (sortBy) {
      case 'date':
        aValue = new Date(a.startTime)
        bValue = new Date(b.startTime)
        break
      case 'client':
        aValue = `${a.client.firstName} ${a.client.lastName}`
        bValue = `${b.client.firstName} ${b.client.lastName}`
        break
      case 'master':
        aValue = `${a.master.firstName} ${a.master.lastName}`
        bValue = `${b.master.firstName} ${b.master.lastName}`
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      default:
        aValue = a.startTime
        bValue = b.startTime
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h2>
          <p className="mt-2 text-gray-600">{error}</p>
                  <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Попробовать снова
                  </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Записи клиентов
            </h2>
          </div>
        </div>

        {/* Переключение видов убрано — здесь всегда список */}

        {/* Фильтры */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Все статусы</option>
                <option value="NEW">Создана</option>
                <option value="CONFIRMED">Подтверждена</option>
                <option value="COMPLETED">Завершена</option>
                <option value="NO_SHOW">Не пришел</option>
                <option value="CANCELLED_BY_CLIENT">Отменена клиентом</option>
                <option value="CANCELLED_BY_SALON">Отменена администратором</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Мастер
              </label>
              <select
                value={masterFilter}
                onChange={(e) => setMasterFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Все мастера</option>
                {masters.map(master => (
                  <option key={master.id} value={master.id}>{master.firstName} {master.lastName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setMasterFilter('all');
                  setSearchTerm('');
                  setSortBy('date');
                  setSortOrder('desc');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Список бронирований */}
        <div className="mt-6">
          {sortedBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет записей</h3>
              <p className="mt-1 text-sm text-gray-500">
                Записи будут отображаться здесь после их создания.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                  {sortedBookings.map((booking) => {
                  const startTime = formatDateTime(booking.startTime)
                  const endTime = formatDateTime(booking.endTime)
                    const canCancel = booking.status === 'NEW' || booking.status === 'CONFIRMED'
                    const canEdit = booking.status !== 'COMPLETED'
                    const isExpanded = expandedBookings.has(booking.id)
                    const isEditing = editingBookings.has(booking.id)
                    const editForm = editForms[booking.id] || {}

                    // Отладочная информация
                    console.log('🔍 Booking debug:', {
                      id: booking.id,
                      status: booking.status,
                      canEdit,
                      canCancel,
                      isExpanded,
                      isEditing
                    })

                  return (
                    <div key={booking.id} className="p-6 hover:bg-gray-50">
                        {/* Заголовок брони */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                              <button
                                onClick={() => toggleExpanded(booking.id)}
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-medium text-gray-900">
                                  #{booking.bookingNumber}
                                </h3>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[booking.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                                  {statusNames[booking.status as keyof typeof statusNames] || booking.status}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {startTime.date}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {startTime.time} - {endTime.time}
                                </div>
                              </div>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Действия */}
                          <div className="ml-6 flex flex-col space-y-2">
                            {/* Отладочная информация */}
                            <div className="text-xs text-gray-500 mb-2">
                              Статус: {booking.status} | 
                              Можно редактировать: {canEdit ? 'Да' : 'Нет'} | 
                              Можно отменить: {canCancel ? 'Да' : 'Нет'}
                            </div>
                            
                            {canEdit && (
                              <button
                                onClick={() => isEditing ? saveChanges(booking.id) : startEditing(booking)}
                                className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                              >
                                {isEditing ? (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Сохранить
                                  </>
                                ) : (
                                  <>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Редактировать
                                  </>
                                )}
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => cancelBooking(booking.id)}
                                disabled={cancellingBooking === booking.id}
                                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancellingBooking === booking.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                    Отменяем...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-2" />
                                    Отменить
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Раскрываемая информация */}
                        {isExpanded && (
                          <div className="mt-6 space-y-6">
                            {/* Форма редактирования */}
                            {isEditing && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-blue-900 mb-4">Редактирование брони</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Время начала
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={editForm.startTime || ''}
                                      onChange={(e) => updateEditForm(booking.id, 'startTime', e.target.value)}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Мастер
                                    </label>
                                    <select
                                      value={editForm.masterId || ''}
                                      onChange={(e) => updateEditForm(booking.id, 'masterId', e.target.value)}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    >
                                      {masters.map(master => (
                                        <option key={master.id} value={master.id}>
                                          {master.firstName} {master.lastName}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Длительность (мин)
                                    </label>
                                    <input
                                      type="number"
                                      min={15}
                                      step={15}
                                      value={editForm.duration || 0}
                                      onChange={(e) => updateEditForm(booking.id, 'duration', parseInt(e.target.value) || 0)}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    />
                                    {overlaps[booking.id] && (
                                      <p className="mt-1 text-xs text-orange-600">
                                        Внимание: новая длительность пересекается с другой записью. Сохранение возможно, но учтите конфликт.
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Общая цена (₽)
                                    </label>
                                    <input
                                      type="number"
                                      value={editForm.totalPrice || 0}
                                      onChange={(e) => updateEditForm(booking.id, 'totalPrice', parseFloat(e.target.value))}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                      min="0"
                                      step="100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Комментарий
                                    </label>
                                    <textarea
                                      value={editForm.notes || ''}
                                      onChange={(e) => updateEditForm(booking.id, 'notes', e.target.value)}
                                      rows={2}
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                      placeholder="Причина изменения..."
                                    />
                                  </div>
                                </div>
                                <div className="mt-4 flex justify-end space-x-2">
                                  <button
                                    onClick={() => cancelEditing(booking.id)}
                                    className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Информация о клиенте и услугах */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Клиент */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Клиент</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <User className="w-4 h-4 mr-2" />
                                  {booking.client.firstName} {booking.client.lastName}
                                </div>
                                <div className="flex items-center">
                                  <Mail className="w-4 h-4 mr-2" />
                                  {booking.client.email}
                                </div>
                                {booking.client.phone && (
                                  <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {booking.client.phone}
                                  </div>
                                )}
                                {booking.client.telegram && (
                                  <div className="flex items-center">
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    {booking.client.telegram}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Услуги и мастер */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Услуги</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                {booking.services.map((service, index) => (
                                    <div key={index} className="flex justify-between">
                                      <span>{service.name} ({service.duration} мин)</span>
                                      <span className="font-medium">{service.price} ₽</span>
                                  </div>
                                ))}
                                  <div className="pt-2 border-t border-gray-200">
                                    <div className="flex justify-between font-medium">
                                      <span>Мастер:</span>
                                      <span>{booking.master.firstName} {booking.master.lastName}</span>
                                  </div>
                                    <div className="flex justify-between font-medium text-lg text-blue-600">
                                      <span>Итого:</span>
                                      <span>{booking.totalPrice} ₽</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                            {/* Комментарий */}
                          {booking.notes && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Комментарий</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                  {booking.notes}
                                </p>
                            </div>
                          )}
                        </div>
                        )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}