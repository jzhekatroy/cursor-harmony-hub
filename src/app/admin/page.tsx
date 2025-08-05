'use client'

import { useState, useEffect } from 'react'
import { Plus, Filter, Calendar as CalendarIcon } from 'lucide-react'

// Заглушка для календаря - позже заменим на FullCalendar
const CalendarPlaceholder = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
    <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">Календарь бронирований</h3>
    <p className="text-gray-500 mb-6">
      Здесь будет отображаться календарь с бронированиями всех мастеров
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Сегодня</h4>
        <p className="text-sm text-gray-600">5 записей</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Завтра</h4>
        <p className="text-sm text-gray-600">8 записей</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Эта неделя</h4>
        <p className="text-sm text-gray-600">42 записи</p>
      </div>
    </div>
  </div>
)

interface Booking {
  id: string
  clientName: string
  serviceName: string
  masterName: string
  startTime: string
  endTime: string
  status: 'CREATED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED_BY_CLIENT' | 'CANCELLED_BY_STAFF' | 'NO_SHOW'
}

const mockBookings: Booking[] = [
  {
    id: '1',
    clientName: 'Анна Иванова',
    serviceName: 'Стрижка и укладка',
    masterName: 'Мария Петрова',
    startTime: '10:00',
    endTime: '11:30',
    status: 'CONFIRMED'
  },
  {
    id: '2',
    clientName: 'Елена Сидорова',
    serviceName: 'Маникюр',
    masterName: 'Анна Козлова',
    startTime: '12:00',
    endTime: '13:00',
    status: 'CREATED'
  },
  {
    id: '3',
    clientName: 'Ольга Федорова',
    serviceName: 'Окрашивание',
    masterName: 'Мария Петрова',
    startTime: '14:00',
    endTime: '16:00',
    status: 'CONFIRMED'
  }
]

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
              <option value="maria">Мария Петрова</option>
              <option value="anna">Анна Козлова</option>
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
        <CalendarPlaceholder />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Записи на {new Date(selectedDate).toLocaleDateString('ru-RU')}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {mockBookings.map((booking) => (
              <div key={booking.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {booking.clientName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {booking.serviceName} • {booking.masterName}
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