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
    case 'CREATED': return 'bg-yellow-100 text-yellow-800'
    case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
    case 'COMPLETED': return 'bg-green-100 text-green-800'
    case 'CANCELLED_BY_CLIENT':
    case 'CANCELLED_BY_STAFF': return 'bg-red-100 text-red-800'
    case 'NO_SHOW': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'CREATED': return 'Создана'
    case 'CONFIRMED': return 'Подтверждена'
    case 'COMPLETED': return 'Выполнена'
    case 'CANCELLED_BY_CLIENT': return 'Отменена клиентом'
    case 'CANCELLED_BY_STAFF': return 'Отменена сотрудником'
    case 'NO_SHOW': return 'Не пришел'
    default: return status
  }
}

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMaster, setSelectedMaster] = useState('all')
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  
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

          const schedulesResults = await Promise.all(schedulesPromises)
          const schedulesMap: Record<string, MasterSchedule[]> = {}
          mastersData.masters.forEach((master: Master, index: number) => {
            schedulesMap[master.id] = schedulesResults[index].schedules || []
          })
          setMasterSchedules(schedulesMap)
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

    // Добавляем бронирования
    filteredBookings.forEach(booking => {
      events.push({
        id: booking.id,
        title: `${booking.client.firstName} ${booking.client.lastName} - ${booking.services.map(s => s.name).join(', ')}`,
        start: booking.startTime,
        end: booking.endTime,
        backgroundColor: getStatusColor(booking.status).includes('blue') ? '#3b82f6' : 
                     getStatusColor(booking.status).includes('green') ? '#10b981' :
                     getStatusColor(booking.status).includes('yellow') ? '#f59e0b' :
                     getStatusColor(booking.status).includes('red') ? '#ef4444' : '#6b7280',
        borderColor: getStatusColor(booking.status).includes('blue') ? '#3b82f6' : 
                    getStatusColor(booking.status).includes('green') ? '#10b981' :
                    getStatusColor(booking.status).includes('yellow') ? '#f59e0b' :
                    getStatusColor(booking.status).includes('red') ? '#ef4444' : '#6b7280',
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
        
        // Создаем события нерабочего времени для следующих 4 недель
        for (let week = 0; week < 4; week++) {
          const date = new Date()
          date.setDate(date.getDate() + (dayOfWeek - date.getDay() + 7) % 7 + week * 7)
          
          events.push({
            id: `non-working-${selectedMaster}-${dayOfWeek}-${week}`,
            title: 'Нерабочее время',
            start: `${date.toISOString().split('T')[0]}T${startTime}:00`,
            end: `${date.toISOString().split('T')[0]}T${endTime}:00`,
            backgroundColor: '#9ca3af',
            borderColor: '#6b7280',
            textColor: '#ffffff',
            display: 'background',
            extendedProps: {
              type: 'non-working',
              reason: 'Рабочее время'
            }
          })
        }
      })

      // Добавляем отсутствия
      masterAbsencesData.forEach((absence: MasterAbsence) => {
        events.push({
          id: `absence-${absence.id}`,
          title: 'Отсутствие',
          start: absence.startDate,
          end: absence.endDate,
          backgroundColor: '#9ca3af',
          borderColor: '#6b7280',
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