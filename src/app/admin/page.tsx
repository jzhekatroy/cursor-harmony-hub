'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import FullCalendarComponent from '@/components/FullCalendar'

import { getCurrentTimeInTimezone, isPastTimeInSalonTimezone, createDateInSalonTimezone } from '@/lib/timezone'

// Локальные утилиты для работы с временем и датами
const formatTime = (timeString: string) => {
  // Если это уже время в формате HH:mm, возвращаем как есть
  if (timeString.match(/^\d{2}:\d{2}$/)) {
    return timeString
  }
  // Иначе пытаемся парсить как дату
  const date = new Date(timeString)
  if (isNaN(date.getTime())) {
    return timeString // Возвращаем исходную строку если не удалось распарсить
  }
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// Формат для input[type="datetime-local"] без UTC-сдвига
const toLocalDateTimeInputValue = (date: Date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

// Функция для получения понедельника текущей недели
const getMondayOfCurrentWeek = (date: Date) => {
  const monday = new Date(date)
  const dayOfWeek = date.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Если воскресенье, то 6 дней назад
  monday.setDate(date.getDate() - daysToMonday)
  return monday
}

const getWeekDays = (startDate: Date) => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    days.push(day)
  }
  return days
}

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
  isActive: boolean
}

// Новые интерфейсы для расписания и отсутствий
interface MasterSchedule {
  masterId: string
  dayOfWeek: number // 0-6 (воскресенье-суббота)
  startTime: string // "09:00"
  endTime: string // "18:00"
  breakStart?: string // "13:00"
  breakEnd?: string // "14:00"
}

interface MasterAbsence {
  masterId: string
  startDate: string // ISO date string
  endDate: string // ISO date string
  reason: string
  description?: string
}

// Функция для получения цвета статуса
const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    case 'COMPLETED':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'Подтверждено'
    case 'PENDING':
      return 'Ожидает'
    case 'CANCELLED':
      return 'Отменено'
    case 'COMPLETED':
      return 'Завершено'
    default:
      return status
  }
}

const getStatusBgColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-green-500'
    case 'PENDING':
      return 'bg-yellow-500'
    case 'CANCELLED':
      return 'bg-red-500'
    case 'COMPLETED':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}

const getStatusBorderColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return 'border-green-500'
    case 'PENDING':
      return 'border-yellow-500'
    case 'CANCELLED':
      return 'border-red-500'
    case 'COMPLETED':
      return 'border-blue-500'
    default:
      return 'border-gray-500'
  }
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long' 
  })
}

export default function AdminDashboard() {

  const [bookings, setBookings] = useState<Booking[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [masterSchedules, setMasterSchedules] = useState<MasterSchedule[]>([])
  const [masterAbsences, setMasterAbsences] = useState<MasterAbsence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<any>(null)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [editForm, setEditForm] = useState({
    startTime: '',
    masterId: '',
    duration: 0,
    totalPrice: 0,
    notes: ''
  })
  const [hasOverlap, setHasOverlap] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Генерируем дни недели
  // const weekDays = getWeekDays(new Date())

  // Обновляем текущее время каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      // setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    if (typeof window === 'undefined') return
    
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Требуется авторизация')
        return
      }

      // Загружаем данные параллельно
      const [teamResponse, bookingsResponse, mastersResponse] = await Promise.all([
        fetch('/api/team/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/masters-list', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      ])

      if (!teamResponse.ok) throw new Error('Ошибка загрузки настроек команды')
      if (!bookingsResponse.ok) throw new Error('Ошибка загрузки бронирований')
      if (!mastersResponse.ok) throw new Error('Ошибка загрузки мастеров')

      const [teamData, bookingsData, mastersData] = await Promise.all([
        teamResponse.json(),
        bookingsResponse.json(),
        mastersResponse.json()
      ])

      setTeam(teamData)
      // Нормализуем услуги/клиента в бронированиях, чтобы в UI были имя/услуги/длительность
      const normalizedBookings = (bookingsData.bookings || []).map((b: any) => ({
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
      setBookings(normalizedBookings)
      setMasters(mastersData.masters || [])
      
      // Загружаем расписание и отсутствия для всех мастеров
      if (mastersData.masters && mastersData.masters.length > 0) {
        const schedulesPromises = mastersData.masters.map((master: Master) =>
          fetch(`/api/masters/${master.id}/schedule`, {
          headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()).then(data => data.schedules || [])
        )
        
        const absencesPromises = mastersData.masters.map((master: Master) =>
          fetch(`/api/masters/${master.id}/absences`, {
          headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()).then(data => data.absences || [])
        )
        
        const [schedulesResults, absencesResults] = await Promise.all([
          Promise.all(schedulesPromises),
          Promise.all(absencesPromises)
        ])
        
        // Объединяем все расписания и отсутствия
        const allSchedules = schedulesResults.flat().map((schedule: any) => ({
          masterId: schedule.masterId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd
        }))
        
        const allAbsences = absencesResults.flat().map((absence: any) => ({
          masterId: absence.masterId,
          startDate: absence.startDate,
          endDate: absence.endDate,
          reason: absence.reason,
          description: absence.description
        }))
        
        setMasterSchedules(allSchedules)
        setMasterAbsences(allAbsences)
      }
      
    } catch (err: any) {
      console.error('Ошибка загрузки данных:', err)
      setError(err.message || 'Произошла ошибка при загрузке данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Фильтруем брони по выбранной дате в календаре
  const filteredBookings = useMemo(() => {
    // Получаем выбранную дату из FullCalendar через ref или state
    // Пока что возвращаем все брони, но в будущем можно добавить фильтрацию
    return [...bookings]
  }, [bookings])



  // Функции для редактирования брони в календаре
  const startEditingBooking = (booking: Booking) => {
    setEditingBooking(booking)
    const durationSum = booking.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0
    setEditForm({
      // ВАЖНО: для datetime-local используем локальное время, а не toISOString()
      startTime: toLocalDateTimeInputValue(new Date(booking.startTime)),
      masterId: booking.master.id,
      duration: durationSum,
      totalPrice: booking.totalPrice,
      notes: booking.notes || ''
    })
  }

  const cancelEditing = () => {
    setEditingBooking(null)
    setEditForm({
      startTime: '',
      masterId: '',
      duration: 0,
      totalPrice: 0,
      notes: ''
    })
    setHasOverlap(false)
  }

  const saveBookingChanges = async () => {
    if (!editingBooking) return

    try {
      setIsSaving(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        // Обновляем список бронирований
        await loadData()
        // Закрываем модальное окно
        cancelEditing()
      } else {
        const errorData = await response.json()
        alert(`Ошибка сохранения: ${errorData.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Произошла ошибка при сохранении')
    } finally {
      setIsSaving(false)
    }
  }

  const updateEditForm = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  // Проверка пересечения при изменении времени/мастера/длительности
  useEffect(() => {
    if (!editingBooking || !editForm.startTime || !editForm.masterId || !team) {
      setHasOverlap(false)
      return
    }
    try {
      const tz = team?.settings?.timezone || team?.timezone || 'Europe/Moscow'
      const [datePart, timePart] = editForm.startTime.split('T')
      const [y, m, d] = datePart.split('-').map(Number)
      const [hh, mm] = timePart.split(':').map(Number)
      const utcStart = createDateInSalonTimezone(y, m, d, hh, mm, tz)
      const utcEnd = new Date(utcStart.getTime() + (Number(editForm.duration) || 0) * 60 * 1000)

      const overlap = bookings.some(b => {
        if (b.id === editingBooking.id) return false
        if (b.master.id !== editForm.masterId) return false
        if (!['NEW', 'CONFIRMED'].includes(b.status)) return false
        const bStart = new Date(b.startTime)
        const bEnd = new Date(b.endTime)
        return utcStart < bEnd && utcEnd > bStart
      })
      setHasOverlap(overlap)
    } catch {
      setHasOverlap(false)
    }
  }, [editingBooking, editForm.startTime, editForm.masterId, editForm.duration, bookings, team])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Ошибка</div>
          <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Попробовать снова
        </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Панель администратора</h1>
      </div>

            {/* Убрали кнопку "+ мастер" по запросу */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Убрали заголовок "Календарь" по запросу */}



      {/* Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* FullCalendar Component */}
          <div className="p-6">
            <FullCalendarComponent
              bookings={bookings}
              masters={masters}
              masterSchedules={masterSchedules}
              masterAbsences={masterAbsences}
              onBookingClick={startEditingBooking}
              salonTimezone={team?.settings?.timezone || team?.timezone || 'Europe/Moscow'}
            />
                </div>
              </div>

        {/* Модальное окно редактирования брони */}
        {editingBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Редактирование брони #{editingBooking.bookingNumber}
                </h3>
            </div>
            
              <div className="p-6 space-y-6">
                {/* Информация о клиенте (только для чтения) */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Клиент</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Имя:</span> {editingBooking.client.firstName} {editingBooking.client.lastName}
          </div>
                      <div>
                        <span className="font-medium">Email:</span> {editingBooking.client.email}
                </div>
                      {editingBooking.client.phone && (
                        <div>
                          <span className="font-medium">Телефон:</span> {editingBooking.client.phone}
                </div>
                      )}
                      {editingBooking.client.telegram && (
                        <div>
                          <span className="font-medium">Telegram:</span> {editingBooking.client.telegram}
                </div>
                      )}
                    </div>
                      </div>
                    </div>
                    
                {/* Услуги (только для чтения) */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Услуги</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    {editingBooking.services.map((service, index) => (
                      <div key={index} className="flex justify-between text-sm mb-1">
                        <span>{service.name} ({service.duration} мин)</span>
                        <span className="font-medium">{service.price} ₽</span>
                        </div>
                ))}
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Длительность:</span>{' '}
                      {editForm.duration} мин
                    </div>
                              </div>
            </div>

                {/* Форма редактирования */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Время начала
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.startTime}
                      onChange={(e) => updateEditForm('startTime', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
          </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Мастер
                    </label>
                    <select
                      value={editForm.masterId}
                      onChange={(e) => updateEditForm('masterId', e.target.value)}
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
                      value={editForm.duration}
                      onChange={(e) => updateEditForm('duration', parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    {hasOverlap && (
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
                      value={editForm.totalPrice}
                      onChange={(e) => updateEditForm('totalPrice', parseFloat(e.target.value))}
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
                      value={editForm.notes}
                      onChange={(e) => updateEditForm('notes', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Причина изменения..."
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={saveBookingChanges}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Сохраняем...
                    </>
                  ) : (
                    'Сохранить'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  )
}