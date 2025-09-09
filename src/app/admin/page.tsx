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
    notes: '',
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: ''
  })
  const [editClientQuery, setEditClientQuery] = useState('')
  const [editClientMatches, setEditClientMatches] = useState<any[]>([])
  const [editClientLoading, setEditClientLoading] = useState(false)
  const [isEditingClient, setIsEditingClient] = useState(false)
  const [hasOverlap, setHasOverlap] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<any>({
    date: '',
    time: '',
    masterId: '',
    serviceId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: ''
  })
  const [services, setServices] = useState<Array<{ id: string; name: string; duration: number; price: number }>>([])
  const [clientQuery, setClientQuery] = useState('')
  const [clientMatches, setClientMatches] = useState<any[]>([])
  const [clientSearchLoading, setClientSearchLoading] = useState(false)

  // Генерируем дни недели
  // const weekDays = getWeekDays(new Date())

  // Обновляем текущее время каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      // setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const loadData = async (silent: boolean = false) => {
    if (typeof window === 'undefined') return
    
    try {
      if (!silent) setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Требуется авторизация')
        return
      }

      // Загружаем данные параллельно
      const [teamResponse, bookingsResponse, mastersResponse, servicesResponse] = await Promise.all([
        fetch('/api/team/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/masters-list', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/services', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (!teamResponse.ok) throw new Error('Ошибка загрузки настроек команды')
      if (!bookingsResponse.ok) throw new Error('Ошибка загрузки бронирований')
      if (!mastersResponse.ok) throw new Error('Ошибка загрузки мастеров')
      if (!servicesResponse.ok) throw new Error('Ошибка загрузки услуг')

      const [teamData, bookingsData, mastersData, servicesData] = await Promise.all([
        teamResponse.json(),
        bookingsResponse.json(),
        mastersResponse.json(),
        servicesResponse.json()
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
      setServices((servicesData.services || servicesData || []).map((s: any) => ({ id: s.id, name: s.name, duration: s.duration, price: Number(s.price) })))
      
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
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Поиск клиентов по вводу (имя/телефон/email) — debounce 300ms
  useEffect(() => {
    let timer: any
    const run = async () => {
      const q = (clientQuery || '').trim()
      if (!q) { setClientMatches([]); return }
      try {
        setClientSearchLoading(true)
        const token = localStorage.getItem('token')
        const url = `/api/clients?q=${encodeURIComponent(q)}&page=1&pageSize=5`
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        if (res.ok) {
          const data = await res.json()
          setClientMatches(data.clients || data || [])
        } else {
          setClientMatches([])
        }
      } catch {
        setClientMatches([])
      } finally {
        setClientSearchLoading(false)
      }
    }
    timer = setTimeout(run, 300)
    return () => clearTimeout(timer)
  }, [clientQuery])

  // Автообновление раз в минуту (тихий режим без спиннера)
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadData(true)
    }, 60_000)
    return () => clearInterval(intervalId)
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
    const startMs = new Date(booking.startTime).getTime()
    const endMs = new Date(booking.endTime).getTime()
    const durationSum = Math.max(0, Math.round((endMs - startMs) / 60000))
    setEditForm({
      // ВАЖНО: для datetime-local используем локальное время, а не toISOString()
      startTime: toLocalDateTimeInputValue(new Date(booking.startTime)),
      masterId: booking.master.id,
      duration: durationSum,
      totalPrice: booking.totalPrice,
      notes: booking.notes || '',
      clientId: (booking as any).clientId || '',
      clientName: `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim(),
      clientEmail: booking.client.email || '',
      clientPhone: booking.client.phone || ''
    })
    setEditClientQuery('')
    setEditClientMatches([])
    setIsEditingClient(false)
  }

  const cancelEditing = () => {
    setEditingBooking(null)
    setEditForm({
      startTime: '',
      masterId: '',
      duration: 0,
      totalPrice: 0,
      notes: '',
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: ''
    })
    setHasOverlap(false)
    setIsEditingClient(false)
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
        body: JSON.stringify({
          startTime: editForm.startTime,
          masterId: editForm.masterId,
          duration: editForm.duration,
          totalPrice: editForm.totalPrice,
          notes: editForm.notes,
          clientId: editForm.clientId || undefined,
          clientData: editForm.clientId ? undefined : (
            editForm.clientName || editForm.clientPhone || editForm.clientEmail
              ? { name: editForm.clientName, email: editForm.clientEmail, phone: editForm.clientPhone }
              : undefined
          )
        })
      })

      if (response.ok) {
        // Обновляем список бронирований без сброса UI (сохраняем дату календаря)
        await loadData(true)
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

  const cancelCurrentBooking = async () => {
    if (!editingBooking) return
    if (!confirm('Отменить эту запись?')) return
    try {
      setIsCancelling(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/bookings/${editingBooking.id}/cancel`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Ошибка отмены: ${data.error || res.statusText}`)
        return
      }
      await loadData(true)
      cancelEditing()
    } catch (e) {
      alert('Не удалось отменить запись')
    } finally {
      setIsCancelling(false)
    }
  }

  const updateEditForm = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  // Поиск клиента при редактировании (debounce 300ms)
  useEffect(() => {
    let t: any
    const run = async () => {
      const q = (editClientQuery || '').trim()
      if (!q) { setEditClientMatches([]); return }
      try {
        setEditClientLoading(true)
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}&page=1&pageSize=5`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        if (res.ok) {
          const data = await res.json()
          setEditClientMatches(data.clients || data || [])
        } else {
          setEditClientMatches([])
        }
      } finally {
        setEditClientLoading(false)
      }
    }
    t = setTimeout(run, 300)
    return () => clearTimeout(t)
  }, [editClientQuery])

  // Утилиты форматирования длительности как на странице услуг
  const getHoursWord = (hours: number) => {
    const mod100 = hours % 100
    if (mod100 >= 11 && mod100 <= 14) return 'часов'
    const mod10 = hours % 10
    if (mod10 === 1) return 'час'
    if (mod10 >= 2 && mod10 <= 4) return 'часа'
    return 'часов'
  }

  const formatDurationRu = (minutes: number) => {
    if (!minutes) return '0 минут'
    if (minutes < 60) return `${minutes} минут`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    if (rest === 0) return `${hours} ${getHoursWord(hours)}`
    return `${hours} ${getHoursWord(hours)} ${rest} минут`
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
          onClick={() => loadData()}
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

            <div className="flex items-center space-x-4">
              <Link
                href="/debug-phone-logs"
                className="px-6 py-3 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                📱 Логи телефона
              </Link>
            </div>
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
              onBookingCancelled={() => loadData(true)}
              onEmptySlotClick={({ time, master }) => {
                const tz = team?.settings?.timezone || team?.timezone || 'Europe/Moscow'
                const y = Number(time.toLocaleString('ru-RU', { timeZone: tz, year: 'numeric' }))
                const m = Number(time.toLocaleString('ru-RU', { timeZone: tz, month: 'numeric' }))
                const d = Number(time.toLocaleString('ru-RU', { timeZone: tz, day: 'numeric' }))
                const hh = Number(time.toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', hour12: false }))
                const mm = Number(time.toLocaleString('ru-RU', { timeZone: tz, minute: '2-digit' }))
                const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const timeStr = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
                setCreateForm({ date: dateStr, time: timeStr, masterId: master.id, serviceId: services[0]?.id || '', clientName: '', clientEmail: '', clientPhone: '' })
                setClientQuery('')
                setClientMatches([])
                setCreateDialogOpen(true)
              }}
            />
                </div>
              </div>

        {/* Модальное окно редактирования брони */}
        {editingBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Редактирование брони #{editingBooking.bookingNumber}
                </h3>
              <button
                  onClick={cancelEditing}
                  className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                  Закрыть
              </button>
            </div>
            
              <div className="p-6 space-y-6">
                {/* Информация о клиенте (только для чтения) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Клиент</h4>
                    {!isEditingClient && (
                      <button
                        type="button"
                        onClick={()=>setIsEditingClient(true)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Редактировать
                      </button>
                    )}
                  </div>
                  {!isEditingClient ? (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Имя:</span> {editForm.clientName || `${editingBooking.client.firstName} ${editingBooking.client.lastName}`}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {editForm.clientEmail || editingBooking.client.email}
                        </div>
                        {(editForm.clientPhone || editingBooking.client.phone) && (
                          <div>
                            <span className="font-medium">Телефон:</span> {editForm.clientPhone || editingBooking.client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editClientQuery}
                        onChange={(e)=>setEditClientQuery(e.target.value)}
                        placeholder="Поиск по имени, телефону или email"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      {(editClientMatches.length > 0 || editClientLoading) && (
                        <div className="border border-gray-200 rounded-md max-h-44 overflow-y-auto bg-white shadow-sm">
                          {editClientLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-500">Поиск…</div>
                          ) : (
                            editClientMatches.map((c:any) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={()=>{
                                  const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim()
                                  setEditForm(p=>({
                                    ...p,
                                    clientId: c.id,
                                    clientName: fullName,
                                    clientEmail: c.email || '',
                                    clientPhone: c.phone || ''
                                  }))
                                  setEditClientQuery(fullName || c.email || c.phone || '')
                                  setEditClientMatches([])
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                              >
                                <div className="font-medium text-gray-900">{(c.firstName || c.lastName) ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : 'Без имени'}</div>
                                <div className="text-xs text-gray-600 flex gap-3">
                                  <span>{c.email}</span>
                                  {c.phone && <span>{c.phone}</span>}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input type="text" value={editForm.clientName} onChange={(e)=>setEditForm(p=>({...p, clientId: '', clientName: e.target.value}))} placeholder="Имя клиента" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                        <input type="email" value={editForm.clientEmail} onChange={(e)=>setEditForm(p=>({...p, clientId: '', clientEmail: e.target.value}))} placeholder="Email" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                        <input type="tel" value={editForm.clientPhone} onChange={(e)=>setEditForm(p=>({...p, clientId: '', clientPhone: e.target.value}))} placeholder="Телефон" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">Подбор клиента из поиска или введите нового (для нового — имя и телефон обязательны).</div>
                        <button type="button" onClick={()=>setIsEditingClient(false)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Готово</button>
                      </div>
                    </div>
                  )}
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
                      Длительность
                    </label>
                    {(() => {
                      const allowedMinutes = [0, 15, 30, 45]
                      const rawMinutes = Number(editForm.duration) || 0
                      const hoursValue = Math.max(0, Math.min(10, Math.floor(rawMinutes / 60)))
                      const minutesValue = allowedMinutes.includes(rawMinutes % 60) ? (rawMinutes % 60) : 0
                      const setDurationFromHm = (h: number, m: number) => updateEditForm('duration', h * 60 + m)
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700 whitespace-nowrap">Часы</label>
                            <select
                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                              value={hoursValue}
                              onChange={(e) => {
                                const h = parseInt(e.target.value)
                                setDurationFromHm(h, minutesValue)
                              }}
                            >
                              {[0,1,2,3,4,5,6,7,8,9,10].map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2 md:col-span-1">
                            <label className="text-sm text-gray-700 whitespace-nowrap">Минуты</label>
                            <select
                              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                              value={minutesValue}
                              onChange={(e) => {
                                const m = parseInt(e.target.value)
                                setDurationFromHm(hoursValue, m)
                              }}
                            >
                              {[0,15,30,45].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div className="text-sm text-gray-500 md:text-right">
                            {formatDurationRu(Number(editForm.duration) || 0)}
                          </div>
                        </div>
                      )
                    })()}
                    {hasOverlap && (
                      <p className="mt-1 text-xs text-orange-600">
                        Внимание: новая длительность пересекается с другой записью. Сохранение возможно, но учтите конфликт.
                      </p>
                    )}
                    {(Number(editForm.duration) || 0) === 0 && (
                      <p className="mt-1 text-xs text-red-600">
                        Нельзя установить длительность 0 минут
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Общая цена (₽)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editForm.totalPrice}
                      onChange={(e) => updateEditForm('totalPrice', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="0"
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
        {/* Диалог создания записи администратором */}
        {createDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Новая запись</h3>
                <button onClick={() => setCreateDialogOpen(false)} className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Закрыть</button>
              </div>
              <div className="p-6 space-y-4">
                {/* Поиск клиента */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Клиент</label>
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e)=>setClientQuery(e.target.value)}
                    placeholder="Поиск по имени, телефону или email"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  {(clientMatches.length > 0 || clientSearchLoading) && (
                    <div className="mt-1 border border-gray-200 rounded-md max-h-44 overflow-y-auto bg-white shadow-sm">
                      {clientSearchLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Поиск…</div>
                      ) : (
                        clientMatches.map((c:any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={()=>{
                              const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim()
                              setCreateForm((p:any)=>({
                                ...p,
                                clientName: fullName,
                                clientEmail: c.email || '',
                                clientPhone: c.phone || ''
                              }))
                              setClientQuery(fullName || c.email || c.phone || '')
                              setClientMatches([])
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            <div className="font-medium text-gray-900">{(c.firstName || c.lastName) ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : 'Без имени'}</div>
                            <div className="text-xs text-gray-600 flex gap-3">
                              <span>{c.email}</span>
                              {c.phone && <span>{c.phone}</span>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                    <input type="date" value={createForm.date} onChange={(e)=>setCreateForm((p:any)=>({...p, date: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                    <input type="time" value={createForm.time} onChange={(e)=>setCreateForm((p:any)=>({...p, time: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" step={900} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Мастер</label>
                    <select value={createForm.masterId} onChange={(e)=>setCreateForm((p:any)=>({...p, masterId: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      {masters.map(m => (<option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Услуга</label>
                    <select value={createForm.serviceId} onChange={(e)=>setCreateForm((p:any)=>({...p, serviceId: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      {services.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Имя клиента</label>
                    <input type="text" value={createForm.clientName} onChange={(e)=>setCreateForm((p:any)=>({...p, clientName: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Иван Иванов" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={createForm.clientEmail} onChange={(e)=>setCreateForm((p:any)=>({...p, clientEmail: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="example@mail.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                    <input type="tel" value={createForm.clientPhone} onChange={(e)=>setCreateForm((p:any)=>({...p, clientPhone: e.target.value}))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="+7 999 123-45-67" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={()=>setCreateDialogOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Отмена</button>
                <button
                  onClick={async ()=>{
                    try {
                      const token = localStorage.getItem('token')
                      const startTime = `${createForm.date}T${createForm.time}`
                      const res = await fetch('/api/bookings', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          teamSlug: team?.settings?.slug || team?.slug,
                          serviceIds: [createForm.serviceId],
                          masterId: createForm.masterId,
                          startTime,
                          clientData: {
                            name: createForm.clientName,
                            email: createForm.clientEmail,
                            phone: createForm.clientPhone
                          }
                        })
                      })
                      if (!res.ok) {
                        const data = await res.json().catch(()=>({}))
                        alert(`Ошибка создания: ${data.error || res.statusText}`)
                        return
                      }
                      setCreateDialogOpen(false)
                      await loadData(true)
                    } catch (e) {
                      alert('Не удалось создать запись')
                    }
                  }}
                  className="px-4 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  )
}