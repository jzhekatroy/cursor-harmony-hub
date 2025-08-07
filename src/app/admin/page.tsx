'use client'

import { useState, useEffect } from 'react'
import { Plus, Filter, Calendar as CalendarIcon } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

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

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMaster, setSelectedMaster] = useState('all')
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Состояние для живых данных
  const [bookings, setBookings] = useState<Booking[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [masterSchedules, setMasterSchedules] = useState<Record<string, MasterSchedule[]>>({})
  const [masterAbsences, setMasterAbsences] = useState<Record<string, MasterAbsence[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData()
  }, [])

  // Обновление текущего времени каждые 30 секунд
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // Обновляем каждые 30 секунд

    return () => clearInterval(timer)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }

      console.log('🔑 Токен найден, загружаем данные...')

      // Загружаем бронирования
      const bookingsResponse = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!bookingsResponse.ok) {
        throw new Error('Ошибка загрузки бронирований')
      }

      const bookingsData = await bookingsResponse.json()
      console.log('📅 Бронирования загружены:', bookingsData.bookings?.length || 0)
      setBookings(bookingsData.bookings || [])

      // Загружаем мастеров
      const mastersResponse = await fetch('/api/masters-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('👥 Ответ API мастеров:', mastersResponse.status, mastersResponse.statusText)

      if (mastersResponse.ok) {
        const mastersData = await mastersResponse.json()
        console.log('👥 Мастера загружены:', mastersData.masters?.length || 0, mastersData.masters)
        setMasters(mastersData.masters || [])
        
        // Загружаем расписания и отсутствия для каждого мастера
        if (mastersData.masters && mastersData.masters.length > 0) {
          const schedulesPromises = mastersData.masters.map((master: Master) =>
            fetch(`/api/masters/${master.id}/schedule`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }).then(res => {
              console.log(`📅 Расписание для мастера ${master.firstName}:`, res.status)
              return res.ok ? res.json() : { schedules: [] }
            })
          )

          const absencesPromises = mastersData.masters.map((master: Master) =>
            fetch(`/api/masters/${master.id}/absences`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }).then(res => {
              console.log(`🏖️ Отсутствия для мастера ${master.firstName}:`, res.status)
              return res.ok ? res.json() : { absences: [] }
            })
          )

          const [schedulesResults, absencesResults] = await Promise.all([
            Promise.all(schedulesPromises),
            Promise.all(absencesPromises)
          ])

          const schedulesMap: Record<string, MasterSchedule[]> = {}
          const absencesMap: Record<string, MasterAbsence[]> = {}

          mastersData.masters.forEach((master: Master, index: number) => {
            schedulesMap[master.id] = schedulesResults[index].schedules || []
            absencesMap[master.id] = absencesResults[index].absences || []
          })

          setMasterSchedules(schedulesMap)
          setMasterAbsences(absencesMap)
        }
      } else {
        console.error('❌ Ошибка загрузки мастеров:', await mastersResponse.text())
      }

    } catch (err: any) {
      console.error('❌ Ошибка загрузки данных:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Фильтруем бронирования по мастеру
  const filteredBookings = selectedMaster === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.master.id === selectedMaster)

  // Генерируем события для календаря
  const generateCalendarEvents = () => {
    const events: any[] = []

    // Добавляем события прошедшего времени
    const now = currentTime
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Генерируем события прошедшего времени для текущей недели
    const currentDate = new Date(now)
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1) // Понедельник текущей недели
    
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(startOfWeek)
      currentDay.setDate(startOfWeek.getDate() + day)
      const dayStr = currentDay.toISOString().split('T')[0]
      
      // Проверяем, является ли этот день сегодняшним
      const isToday = currentDay.toDateString() === now.toDateString()
      
      if (isToday) {
        // Для сегодняшнего дня добавляем прошедшее время до текущего момента
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        
        // Добавляем прошедшее время с начала дня до текущего момента
        if (currentHour >= 8) { // Если уже 8 утра или позже
          const endTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`
          events.push({
            id: `past-time-${dayStr}`,
            title: '',
            start: `${dayStr}T08:00:00`,
            end: `${dayStr}T${endTime}`,
            backgroundColor: '#d1d5db', // Темно-серый
            borderColor: '#9ca3af',
            textColor: '#6b7280',
            display: 'background',
            extendedProps: {
              type: 'past-time',
              reason: 'Прошедшее время'
            }
          })
        }
      } else if (currentDay < now) {
        // Для прошедших дней добавляем весь день как прошедшее время
        events.push({
          id: `past-time-${dayStr}`,
          title: '',
          start: `${dayStr}T08:00:00`,
          end: `${dayStr}T22:00:00`,
          backgroundColor: '#d1d5db',
          borderColor: '#9ca3af',
          textColor: '#6b7280',
          display: 'background',
          extendedProps: {
            type: 'past-time',
            reason: 'Прошедшее время'
          }
        })
      }
    }

    // Добавляем бронирования
    filteredBookings.forEach(booking => {
      events.push({
        id: booking.id,
        title: `${booking.client.firstName} ${booking.client.lastName} - ${booking.services.map(s => s.name).join(', ')}`,
        start: booking.startTime,
        end: booking.endTime,
        backgroundColor: getStatusColor(booking.status).includes('red') ? '#ef4444' : 
                     getStatusColor(booking.status).includes('blue') ? '#3b82f6' :
                     getStatusColor(booking.status).includes('green') ? '#10b981' :
                     getStatusColor(booking.status).includes('orange') ? '#f97316' :
                     getStatusColor(booking.status).includes('gray') ? '#6b7280' : '#6b7280',
        borderColor: getStatusColor(booking.status).includes('red') ? '#dc2626' : 
                    getStatusColor(booking.status).includes('blue') ? '#2563eb' :
                    getStatusColor(booking.status).includes('green') ? '#059669' :
                    getStatusColor(booking.status).includes('orange') ? '#ea580c' :
                    getStatusColor(booking.status).includes('gray') ? '#4b5563' : '#4b5563',
        textColor: 'white',
        extendedProps: {
          type: 'booking',
          status: booking.status,
          clientName: `${booking.client.firstName} ${booking.client.lastName}`,
          serviceName: booking.services.map(s => s.name).join(', '),
          masterName: `${booking.master.firstName} ${booking.master.lastName}`,
          startTime: booking.startTime,
          endTime: booking.endTime,
        }
      })
    })

    // Добавляем нерабочее время для выбранного мастера
    if (selectedMaster !== 'all') {
      const masterSchedule = masterSchedules[selectedMaster] || []
      const masterAbsencesData = masterAbsences[selectedMaster] || []
      
      // Генерируем нерабочее время на основе расписания
      masterSchedule.forEach(schedule => {
        const dayOfWeek = schedule.dayOfWeek
        const startTime = schedule.startTime
        const endTime = schedule.endTime
        const breakStart = schedule.breakStart
        const breakEnd = schedule.breakEnd
        
        // Создаем события нерабочего времени для следующих 4 недель
        for (let week = 0; week < 4; week++) {
          const date = new Date()
          date.setDate(date.getDate() + (dayOfWeek - date.getDay() + 7) % 7 + week * 7)
          const dateStr = date.toISOString().split('T')[0]
          
          // Добавляем нерабочее время до начала рабочего дня
          if (startTime !== '00:00') {
            events.push({
              id: `non-working-before-${selectedMaster}-${dayOfWeek}-${week}`,
              title: '', // Убираем текст для нерабочего времени
              start: `${dateStr}T00:00:00`,
              end: `${dateStr}T${startTime}:00`,
              backgroundColor: '#9ca3af',
              borderColor: '#6b7280',
              textColor: '#ffffff',
              display: 'background',
              extendedProps: {
                type: 'non-working',
                reason: 'До рабочего времени'
              }
            })
          }
          
          // Добавляем нерабочее время после окончания рабочего дня
          if (endTime !== '23:59') {
            events.push({
              id: `non-working-after-${selectedMaster}-${dayOfWeek}-${week}`,
              title: '', // Убираем текст для нерабочего времени
              start: `${dateStr}T${endTime}:00`,
              end: `${dateStr}T23:59:59`,
              backgroundColor: '#9ca3af',
              borderColor: '#6b7280',
              textColor: '#ffffff',
              display: 'background',
              extendedProps: {
                type: 'non-working',
                reason: 'После рабочего времени'
              }
            })
          }
          
          // Добавляем перерыв, если он есть
          if (breakStart && breakEnd) {
            events.push({
              id: `break-${selectedMaster}-${dayOfWeek}-${week}`,
              title: 'Перерыв',
              start: `${dateStr}T${breakStart}:00`,
              end: `${dateStr}T${breakEnd}:00`,
              backgroundColor: '#fbbf24',
              borderColor: '#f59e0b',
              textColor: '#ffffff',
              display: 'background',
              extendedProps: {
                type: 'break',
                reason: 'Перерыв'
              }
            })
          }
        }
      })

      // Добавляем выходные дни (дни недели, когда мастер не работает)
      const workingDays = masterSchedule.map(s => s.dayOfWeek)
      const allDays = [0, 1, 2, 3, 4, 5, 6] // 0 = воскресенье, 1 = понедельник, и т.д.
      const weekendDays = allDays.filter(day => !workingDays.includes(day))
      
      weekendDays.forEach(dayOfWeek => {
        for (let week = 0; week < 4; week++) {
          const date = new Date()
          date.setDate(date.getDate() + (dayOfWeek - date.getDay() + 7) % 7 + week * 7)
          const dateStr = date.toISOString().split('T')[0]
          
          events.push({
            id: `weekend-${selectedMaster}-${dayOfWeek}-${week}`,
            title: '', // Убираем текст для выходных
            start: `${dateStr}T00:00:00`,
            end: `${dateStr}T23:59:59`,
            backgroundColor: '#9ca3af',
            borderColor: '#6b7280',
            textColor: '#ffffff',
            display: 'background',
            extendedProps: {
              type: 'weekend',
              reason: 'Выходной день'
            }
          })
        }
      })

      // Добавляем отсутствия
      masterAbsencesData.forEach((absence: MasterAbsence) => {
        events.push({
          id: `absence-${absence.id}`,
          title: 'Отсутствие', // Оставляем текст для отсутствий
          start: absence.startDate,
          end: absence.endDate,
          backgroundColor: '#ef4444', // Красный цвет для отсутствий
          borderColor: '#dc2626',
          textColor: '#ffffff',
          display: 'background',
          extendedProps: {
            type: 'absence',
            reason: absence.reason || 'Отсутствие',
            description: absence.description
          }
        })
      })
    }

    return events
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
          <h1 className="text-2xl font-bold text-gray-900">Календарь</h1>
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
            <label className="text-sm font-medium text-gray-700">Дата:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Мастер:</label>
            <select
              value={selectedMaster}
              onChange={(e) => setSelectedMaster(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Все мастера</option>
              {masters.map(master => (
                <option key={master.id} value={master.id}>
                  {master.firstName} {master.lastName}
                </option>
              ))}
            </select>
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
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={generateCalendarEvents()}
            key={currentTime.getTime()} // Принудительное обновление при изменении времени
            now={currentTime}
            eventClick={(info) => {
              const booking = bookings.find(b => b.id === info.event.id);
              if (booking) {
                alert(`Запись: ${booking.client.firstName} ${booking.client.lastName} - ${booking.services.map(s => s.name).join(', ')}\nСтатус: ${getStatusText(booking.status)}`);
              }
            }}
            selectable
            selectMirror
            dayMaxEvents
            editable
            select={() => false} // Disable default selection
            eventDrop={(info) => {
              const booking = bookings.find(b => b.id === info.event.id);
              if (booking && info.event.start) {
                booking.startTime = info.event.start.toISOString().split('T')[1].slice(0, 5);
                if (info.event.end) {
                  booking.endTime = info.event.end.toISOString().split('T')[1].slice(0, 5);
                }
                // In a real app, you'd update the backend
              }
            }}
            eventResize={(info) => {
              const booking = bookings.find(b => b.id === info.event.id);
              if (booking && info.event.end) {
                booking.endTime = info.event.end.toISOString().split('T')[1].slice(0, 5);
                // In a real app, you'd update the backend
              }
            }}
            height="auto"
            locale="ru"
            firstDay={1}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            slotDuration="00:15:00"
            nowIndicator={true}
            nowIndicatorClassNames={['now-indicator']}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Записи на {new Date(selectedDate).toLocaleDateString('ru-RU')}
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
                          {new Date(booking.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
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