'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

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

interface MasterSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
}

interface MasterAbsence {
  id: string
  startDate: string
  endDate: string
  reason?: string
  description?: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'NEW': return 'bg-red-100 text-red-800' // 🔴 Красный - требует внимания
    case 'CONFIRMED': return 'bg-blue-100 text-blue-800' // 🔵 Синий - подтверждено
    case 'COMPLETED': return 'bg-green-100 text-green-800' // 🟢 Зеленый - выполнено
    case 'CANCELLED_BY_CLIENT': return 'bg-gray-100 text-gray-800' // ⚫ Серый - отменено клиентом
    case 'CANCELLED_BY_SALON': return 'bg-gray-100 text-gray-800' // ⚫ Серый - отменено салоном
    case 'NO_SHOW': return 'bg-orange-100 text-orange-800' // 🟠 Оранжевый - не пришел (требует внимания)
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'NEW': return 'Новая'
    case 'CONFIRMED': return 'Подтверждена'
    case 'COMPLETED': return 'Выполнена'
    case 'CANCELLED_BY_CLIENT': return 'Отменена клиентом'
    case 'CANCELLED_BY_SALON': return 'Отменена салоном'
    case 'NO_SHOW': return 'Не пришел'
    default: return status
  }
}

const getStatusBgColor = (status: string) => {
  switch (status) {
    case 'NEW': return '#ef4444' // Красный
    case 'CONFIRMED': return '#3b82f6' // Синий
    case 'COMPLETED': return '#10b981' // Зеленый
    case 'CANCELLED_BY_CLIENT': return '#6b7280' // Серый
    case 'CANCELLED_BY_SALON': return '#6b7280' // Серый
    case 'NO_SHOW': return '#f97316' // Оранжевый
    default: return '#6b7280'
  }
}

const getStatusBorderColor = (status: string) => {
  switch (status) {
    case 'NEW': return '#dc2626'
    case 'CONFIRMED': return '#2563eb'
    case 'COMPLETED': return '#059669'
    case 'CANCELLED_BY_CLIENT': return '#4b5563'
    case 'CANCELLED_BY_SALON': return '#4b5563'
    case 'NO_SHOW': return '#ea580c'
    default: return '#4b5563'
  }
}

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

const formatDate = (date: Date) => {
  return date.toLocaleDateString('ru-RU', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  })
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

export default function AdminDashboard() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    return monday
  })
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedMaster, setSelectedMaster] = useState('all')
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [calendarMaster, setCalendarMaster] = useState<string | null>(null) // Мастер, выбранный в календаре
  const [currentTime, setCurrentTime] = useState(() => new Date())
  
  // Состояние для живых данных
  const [bookings, setBookings] = useState<Booking[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [masterSchedules, setMasterSchedules] = useState<Record<string, MasterSchedule[]>>({})
  const [masterAbsences, setMasterAbsences] = useState<Record<string, MasterAbsence[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Обновление времени каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // каждую минуту

    return () => clearInterval(interval)
  }, [])

  // Загрузка данных
  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Требуется авторизация')
        setLoading(false)
        return
      }

      // Загружаем бронирования
      const bookingsResponse = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!bookingsResponse.ok) throw new Error('Ошибка загрузки бронирований')
      const bookingsData = await bookingsResponse.json()
      setBookings(Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []))

      // Загружаем мастеров
      const mastersResponse = await fetch('/api/masters-list', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!mastersResponse.ok) throw new Error('Ошибка загрузки мастеров')
      const mastersData = await mastersResponse.json()
      setMasters(Array.isArray(mastersData) ? mastersData : (mastersData.masters || []))

      // Загружаем расписания и отсутствия для каждого мастера
      const schedulesData: Record<string, MasterSchedule[]> = {}
      const absencesData: Record<string, MasterAbsence[]> = {}

      const actualMasters = Array.isArray(mastersData) ? mastersData : (mastersData.masters || [])
      for (const master of actualMasters) {
        // Расписание
        const scheduleResponse = await fetch(`/api/masters/${master.id}/schedule`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json()
          const actualSchedule = Array.isArray(scheduleData.schedules) ? scheduleData.schedules : []
          schedulesData[master.id] = actualSchedule
        }

        // Отсутствия
        const absencesResponse = await fetch(`/api/masters/${master.id}/absences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (absencesResponse.ok) {
          const absenceData = await absencesResponse.json()
          const actualAbsences = Array.isArray(absenceData.absences) ? absenceData.absences : []
          absencesData[master.id] = actualAbsences
        }
      }

      setMasterSchedules(schedulesData)
      setMasterAbsences(absencesData)

    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  // Обновление текущего времени
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // Обновляем каждые 30 секунд

    return () => clearInterval(interval)
  }, [])

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData()
  }, [])

  // Определяем, какой мастер показывать в календаре
  const displayMaster = calendarMaster || selectedMaster

  // Фильтрация бронирований
  const filteredBookings = (Array.isArray(bookings) ? bookings : []).filter(booking => {
    const bookingDate = new Date(booking.startTime).toDateString()
    const selectedDateStr = selectedDay.toDateString()
    
    if (displayMaster !== 'all' && booking.master.id !== displayMaster) {
      return false
    }
    
    return bookingDate === selectedDateStr
  })

  // Фильтрация мастеров для отображения в календаре
  const displayMasters = displayMaster === 'all' 
    ? (Array.isArray(masters) ? masters : [])
    : (Array.isArray(masters) ? masters : []).filter(master => master.id === displayMaster)



  // Навигация по неделям
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() - 7)
    setCurrentWeekStart(newWeekStart)
  }

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + 7)
    setCurrentWeekStart(newWeekStart)
  }

  const goToToday = () => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    setCurrentWeekStart(monday)
    setSelectedDay(now)
  }

  const resetMasterSelection = () => {
    setCalendarMaster(null)
    setSelectedMaster('all')
  }

  // Генерация временных слотов
  const generateTimeSlots = () => {
    const slots = []
    // Показываем только рабочее время: 9:00 - 18:00
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()
  const weekDays = getWeekDays(currentWeekStart)



  // Проверка, является ли время рабочим для мастера
  const isWorkingTime = (masterId: string, date: Date, time: string) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay() // 1 = понедельник, 7 = воскресенье
    const schedule = masterSchedules[masterId]?.find(s => s.dayOfWeek === dayOfWeek)
    
    if (!schedule) {
      return false
    }
    
    const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])
    const startMinutes = parseInt(schedule.startTime.split(':')[0]) * 60 + parseInt(schedule.startTime.split(':')[1])
    const endMinutes = parseInt(schedule.endTime.split(':')[0]) * 60 + parseInt(schedule.endTime.split(':')[1])
    
    // Проверяем перерыв
    if (schedule.breakStart && schedule.breakEnd) {
      const breakStartMinutes = parseInt(schedule.breakStart.split(':')[0]) * 60 + parseInt(schedule.breakStart.split(':')[1])
      const breakEndMinutes = parseInt(schedule.breakEnd.split(':')[0]) * 60 + parseInt(schedule.breakEnd.split(':')[1])
      
              if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
          return false
        }
    }
    
    const isWorking = timeMinutes >= startMinutes && timeMinutes < endMinutes
    return isWorking
  }

  // Проверка отсутствия мастера
  const isMasterAbsent = (masterId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const absences = masterAbsences[masterId] || []
    
    return absences.some(absence => {
      const absenceStart = new Date(absence.startDate)
      const absenceEnd = new Date(absence.endDate)
      const checkDate = new Date(dateStr)
      
      return checkDate >= absenceStart && checkDate < absenceEnd
    })
  }

  // Проверка, является ли время прошедшим
  const isPastTime = (date: Date, time: string) => {
    const now = currentTime
    const checkDateTime = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    checkDateTime.setHours(hours, minutes, 0, 0)
    
    return checkDateTime < now
  }

  // Получение бронирования для конкретного времени и мастера
  const getBookingAtTime = (masterId: string, date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0]
    const timeStr = `${dateStr}T${time}:00`
    
    const booking = bookings.find(booking => {
      const bookingStart = new Date(booking.startTime)
      const bookingEnd = new Date(booking.endTime)
      const checkTime = new Date(timeStr)
      
      return booking.master.id === masterId && 
             checkTime >= bookingStart && 
             checkTime < bookingEnd
    })
    
    return booking
  }

  // Проверка, является ли это началом бронирования
  const isBookingStart = (masterId: string, date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0]
    const timeStr = `${dateStr}T${time}:00`
    
    const booking = bookings.find(booking => {
      const bookingStart = new Date(booking.startTime)
      const checkTime = new Date(timeStr)
      
      return booking.master.id === masterId && 
             Math.abs(checkTime.getTime() - bookingStart.getTime()) < 60000 // в пределах 1 минуты
    })
    

    
    return booking
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Загружаем календарь...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Ошибка загрузки данных
        </h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Календарь
            {calendarMaster && (
              <span className="text-lg font-normal text-blue-600 ml-2">
                - {displayMasters.find(m => m.id === calendarMaster)?.firstName} {displayMasters.find(m => m.id === calendarMaster)?.lastName}
              </span>
            )}
          </h1>
          <p className="text-gray-600">Управление бронированиями и расписанием</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Фильтры
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Новая запись
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Мастер:</label>
            <select
              value={selectedMaster}
              onChange={(e) => setSelectedMaster(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Все мастера</option>
              {(Array.isArray(masters) ? masters : []).map(master => (
                <option key={master.id} value={master.id}>
                  {master.firstName} {master.lastName}
                </option>
              ))}
            </select>
            {calendarMaster && (
              <button
                onClick={resetMasterSelection}
                className="ml-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Показать всех
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Вид:</label>
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setView('calendar')}
                className={`px-3 py-1 text-sm ${view === 'calendar' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Календарь
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 text-sm border-l border-gray-300 ${view === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Список
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'calendar' ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Week Navigation */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <button
              onClick={goToPreviousWeek}
              className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {formatDate(currentWeekStart)} - {formatDate(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}
                </h2>
                <div className="text-sm text-gray-500 mt-1">
                  {Array.isArray(masters) ? masters.length : 0} мастеров
                </div>
              </div>
              <button
                onClick={goToToday}
                className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm transition-all duration-200"
              >
                Сегодня
              </button>
            </div>
            
            <button
              onClick={goToNextWeek}
              className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Day Tabs */}
          <div className="flex border-b border-gray-200 bg-white">
            {weekDays.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200 cursor-pointer ${
                  selectedDay.toDateString() === day.toDateString()
                    ? 'border-blue-500 text-blue-600 bg-blue-50 shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="text-xs text-gray-400 mb-1 font-medium">
                  {day.toLocaleDateString('ru-RU', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${
                  selectedDay.toDateString() === day.toDateString() ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {day.getDate()}
                </div>
              </button>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Time slots and masters grid */}
              <div className="grid relative" style={{ 
                gridTemplateColumns: `80px repeat(${displayMasters.length}, 1fr)`,
                gridTemplateRows: `40px repeat(${timeSlots.length}, 50px)`
              }}>

                
                {/* Current time indicator - внутри grid-контейнера */}
                {selectedDay.toDateString() === currentTime.toDateString() && (() => {
                  const currentHour = currentTime.getHours()
                  const currentMinute = currentTime.getMinutes()
                  
                  // Проверяем, что время в рабочем диапазоне (9:00-18:00)
                  if (currentHour >= 9 && currentHour < 18) {
                    const timeSlotIndex = (currentHour - 9) * 2 + Math.floor(currentMinute / 30)
                    
                                      // Вычисляем позицию: заголовок (40px) + слоты до текущего времени (timeSlotIndex * 50px) + точная позиция внутри слота
                  const minutesInSlot = currentMinute % 30
                  const positionInSlot = (minutesInSlot / 30) * 50 // пропорция внутри 30-минутного слота
                  const topPosition = 40 + (timeSlotIndex * 50) + positionInSlot
                    
                    return (
                                          <div 
                      className="absolute bg-red-500 h-2 z-35 pointer-events-none shadow-lg"
                      style={{
                        top: `${topPosition}px`,
                        left: '0px',
                        right: '0px',
                        border: '2px solid red'
                      }}
                      title={`Текущее время: ${currentTime.toLocaleTimeString()}`}
                    />
                    )
                  }
                  return null
                })()}
                {/* Header row with master names */}
                <div className="bg-gradient-to-b from-gray-50 to-gray-100 border-r border-b border-gray-200 flex items-center justify-center text-sm font-bold text-gray-700">
                  Время
                </div>
                {displayMasters.map(master => (
                  <button
                    key={master.id}
                    onClick={() => {
                      if (calendarMaster === master.id) {
                        resetMasterSelection()
                      } else {
                        setCalendarMaster(master.id)
                        setSelectedMaster(master.id)
                      }
                    }}
                    className={`bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 px-3 text-center cursor-pointer transition-all duration-200 hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 ${
                      calendarMaster === master.id ? 'from-blue-100 to-blue-200 text-blue-800 shadow-sm' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{master.firstName}</div>
                      <div className="text-xs text-gray-500">{master.lastName}</div>
                      {calendarMaster === master.id && (
                        <div className="text-xs text-blue-600 mt-1">✓ Выбран</div>
                      )}
                    </div>
                  </button>
                ))}

                {/* Time slots and booking cells */}
                {timeSlots.map((time, timeIndex) => (
                  <React.Fragment key={`time-slot-${time}`}>
                    {/* Time label */}
                    <div className="border-r border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 bg-gray-50">
                      <div className="text-center">
                        <div className="font-bold">{formatTime(time)}</div>
                      </div>
                    </div>
                    
                    {/* Master columns */}
                    {displayMasters.map(master => {
                      const isAbsent = isMasterAbsent(master.id, selectedDay)
                      const isWorking = isWorkingTime(master.id, selectedDay, time)
                      const isPastTimeSlot = isPastTime(selectedDay, time)
                      const booking = getBookingAtTime(master.id, selectedDay, time)
                      
                      let cellClass = 'border-r border-gray-200 relative'
                      let cellContent = null
                      
                      if (isAbsent) {
                        cellClass += ' bg-red-50 border-red-200'
                        cellContent = (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-xs text-red-600 text-center font-medium">
                              <div className="w-2 h-2 bg-red-400 rounded-full mx-auto mb-1"></div>
                              Отсутствует
                            </div>
                          </div>
                        )
                      } else if (isPastTimeSlot) {
                        cellClass += ' bg-gray-100'
                      } else if (!isWorking) {
                        cellClass += ' bg-gray-50'
                      } else {
                        cellClass += ' bg-white'
                      }
                      
                      // Добавляем горизонтальные линии
                      cellClass += ' border-b border-gray-100'
                      
                      if (isBookingStart(master.id, selectedDay, time) && booking) {
                        
                        // Вычисляем длительность бронирования в ячейках
                        const startTime = new Date(booking.startTime)
                        const endTime = new Date(booking.endTime)
                        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
                        const durationSlots = Math.ceil(durationMinutes / 30)
                        
                        // Проверяем, является ли бронь прошедшей или текущей
                        const now = currentTime
                        const isPast = endTime < now
                        const isCurrent = startTime <= now && endTime > now
                        

                        

                        
                        cellContent = (
                          <div 
                            className={`absolute rounded-lg text-xs text-white p-2 overflow-hidden shadow-lg ${
                              isCurrent ? 'shadow-xl ring-2 ring-yellow-300' : ''
                            }`}
                            style={{
                              backgroundColor: getStatusBgColor(booking.status),
                              border: isCurrent ? '2px solid #fbbf24' : 'none',
                              inset: '2px',
                              height: `${durationSlots * 50 - 4}px`, // Растягиваем на всю длительность
                              zIndex: isCurrent ? 40 : 10, // Текущие брони над красной линией
                              opacity: isPast ? 0.15 : isCurrent ? 1 : 0.9
                            }}
                          >
                            <div style={{ 
                              fontWeight: 'bold', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              marginBottom: '4px', 
                              fontSize: '16px', 
                              lineHeight: '1.2', 
                              color: 'white', 
                              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}>
                              {booking.services.map((s: any) => s.service.name).join(', ')}
                            </div>
                            <div style={{ 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              marginBottom: '4px', 
                              fontSize: '12px', 
                              color: 'white', 
                              fontWeight: '600',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {booking.client.firstName} {booking.client.lastName}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: 'white', 
                              fontWeight: '600',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {booking.master.firstName} • {formatTime(booking.startTime)}-{formatTime(booking.endTime)}
                            </div>
                          </div>
                        )
                      } else if (booking) {
                        // Для остальных ячеек бронирования - просто фон без текста
                        const endTime = new Date(booking.endTime)
                        const startTime = new Date(booking.startTime)
                        const now = currentTime
                        const isPast = endTime < now
                        const isCurrent = startTime <= now && endTime > now
                        

                        


                        cellContent = (
                          <div 
                            className="absolute inset-1 rounded-lg"
                            style={{
                              backgroundColor: getStatusBgColor(booking.status),
                              zIndex: isCurrent ? 40 : 10,
                              opacity: isPast ? 0.15 : isCurrent ? 0.8 : 0.9
                            }}
                          />
                        )
                      }
                      
                      return (
                        <div key={`${master.id}-${time}`} className={cellClass}>
                          {cellContent}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
                              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Записи на {selectedDay.toLocaleDateString('ru-RU')}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {booking.client.firstName} {booking.client.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {booking.services.map(s => s.name).join(', ')} • {booking.master.firstName} {booking.master.lastName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                    <button className="text-gray-400 hover:text-gray-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}