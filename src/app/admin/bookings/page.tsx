'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Phone, Mail, MessageCircle, X, Check, AlertCircle } from 'lucide-react'

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
    firstName: string
    lastName: string
  }
  services: BookingService[]
}

const statusColors = {
  'CREATED': 'bg-yellow-100 text-yellow-800',
  'CONFIRMED': 'bg-blue-100 text-blue-800',
  'COMPLETED': 'bg-green-100 text-green-800',
  'NO_SHOW': 'bg-orange-100 text-orange-800',
  'CANCELLED_BY_CLIENT': 'bg-red-100 text-red-800',
  'CANCELLED_BY_STAFF': 'bg-gray-100 text-gray-800'
}

const statusNames = {
  'CREATED': 'Создана',
  'CONFIRMED': 'Подтверждена',
  'COMPLETED': 'Завершена',
  'NO_SHOW': 'Не пришел',
  'CANCELLED_BY_CLIENT': 'Отменена клиентом',
  'CANCELLED_BY_STAFF': 'Отменена администратором'
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    status: '',
    date: '',
    masterId: ''
  })
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
  }, [filter])

  const loadBookings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }

      const params = new URLSearchParams()
      if (filter.status) params.append('status', filter.status)
      if (filter.date) params.append('date', filter.date)
      if (filter.masterId) params.append('masterId', filter.masterId)

      const response = await fetch(`/api/bookings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки бронирований')
      }

      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (err: any) {
      console.error('Ошибка загрузки бронирований:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    try {
      setCancellingBooking(bookingId)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Токен авторизации не найден')
      }

      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка отмены бронирования')
      }

      // Обновляем список бронирований
      await loadBookings()
      
    } catch (err: any) {
      console.error('Ошибка отмены бронирования:', err)
      alert(`Ошибка: ${err.message}`)
    } finally {
      setCancellingBooking(null)
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    return {
      date: date.toLocaleDateString('ru-RU'),
      time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Загружаем записи...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Ошибка загрузки записей
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={loadBookings}
                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            </div>
          </div>
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

        {/* Фильтры */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({...filter, status: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Все статусы</option>
                <option value="CREATED">Создана</option>
                <option value="CONFIRMED">Подтверждена</option>
                <option value="COMPLETED">Завершена</option>
                <option value="NO_SHOW">Не пришел</option>
                <option value="CANCELLED_BY_CLIENT">Отменена клиентом</option>
                <option value="CANCELLED_BY_STAFF">Отменена администратором</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата
              </label>
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter({...filter, date: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilter({ status: '', date: '', masterId: '' })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>

        {/* Список бронирований */}
        <div className="mt-6">
          {bookings.length === 0 ? (
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
                {bookings.map((booking) => {
                  const startTime = formatDateTime(booking.startTime)
                  const endTime = formatDateTime(booking.endTime)
                  const canCancel = booking.status === 'CREATED' || booking.status === 'CONFIRMED'

                  return (
                    <div key={booking.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
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
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Клиент */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Клиент</h4>
                              <div className="space-y-1 text-sm text-gray-600">
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
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Услуги</h4>
                              <div className="space-y-1 text-sm text-gray-600">
                                {booking.services.map((service, index) => (
                                  <div key={index}>
                                    {service.name} ({service.duration} мин) - {service.price} ₽
                                  </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="font-medium">
                                    Мастер: {booking.master.firstName} {booking.master.lastName}
                                  </div>
                                  <div className="font-medium">
                                    Итого: {booking.totalPrice} ₽
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {booking.notes && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-1">Комментарий</h4>
                              <p className="text-sm text-gray-600">{booking.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Действия */}
                        <div className="ml-6 flex flex-col space-y-2">
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