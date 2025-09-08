'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { Search, Calendar, User, MessageSquare, Activity, ArrowLeft } from 'lucide-react'

interface Booking {
  id: string
  bookingNumber: string
  status: string
  startTime: string
  totalPrice: number
  client: {
    id: string
    firstName: string
    lastName: string
    telegramId: string | null
    telegramUsername: string | null
    source: string
  } | null
  team: {
    id: string
    name: string
    slug: string
  }
}

interface Log {
  id: string
  timestamp: string
  level: string
  message: string
  data: any
  url: string
  userAgent: string
  ip: string
  clientId: string | null
  teamId: string | null
  createdAt: string
}

interface ClientAction {
  id: string
  actionType: string
  pageUrl: string
  telegramData: any
  userAgent: string
  ip: string
  createdAt: string
}

export default function BookingLogsPage() {
  const searchParams = useSearchParams()
  const toast = useToast()
  const [bookingId, setBookingId] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [clientActions, setClientActions] = useState<ClientAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      setBookingId(id)
      fetchLogs(id)
    }
  }, [searchParams])

  const fetchLogs = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Токен авторизации отсутствует')
        return
      }

      const response = await fetch(`/api/superadmin/booking-logs?bookingId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки логов')
      }

      setBooking(data.booking)
      setLogs(data.logs)
      setClientActions(data.clientActions)
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(msg)
      toast.error(`Ошибка загрузки логов: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (bookingId.trim()) {
      fetchLogs(bookingId.trim())
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU')
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50'
      case 'WARN': return 'text-yellow-600 bg-yellow-50'
      case 'INFO': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'BOOKING_CREATED': return 'text-green-600 bg-green-50'
      case 'PAGE_VIEW': return 'text-blue-600 bg-blue-50'
      case 'FORM_SUBMIT': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <a 
            href="/superadmin" 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к админке
          </a>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Логи бронирования
        </h1>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="Введите ID бронирования"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !bookingId.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Поиск...' : 'Найти'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {booking && (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Информация о бронировании
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Номер брони</label>
              <div className="text-lg font-mono">{booking.bookingNumber}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <div className="text-lg">{booking.status}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
              <div className="text-lg">{formatTimestamp(booking.startTime)}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Стоимость</label>
              <div className="text-lg font-semibold">{booking.totalPrice} ₽</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Салон</label>
              <div className="text-lg">{booking.team.name}</div>
            </div>
            
            {booking.client && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Клиент</label>
                <div className="text-lg">
                  {booking.client.firstName} {booking.client.lastName}
                  {booking.client.telegramId && (
                    <span className="ml-2 text-sm text-gray-500">
                      (TG: {booking.client.telegramId})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {clientActions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Действия клиента ({clientActions.length})
          </h2>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действие</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Страница</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientActions.map((action) => (
                    <tr key={action.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(action.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionTypeColor(action.actionType)}`}>
                          {action.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {action.pageUrl}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {action.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Логи системы ({logs.length})
          </h2>
          
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLogLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {log.ip}
                  </div>
                </div>
                
                <div className="text-sm text-gray-900 mb-2">
                  {log.message}
                </div>
                
                {log.url && (
                  <div className="text-xs text-gray-500 mb-2">
                    URL: {log.url}
                  </div>
                )}
                
                {log.data && Object.keys(log.data).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                      Данные (нажмите для просмотра)
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && bookingId && logs.length === 0 && clientActions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Логи для бронирования {bookingId} не найдены
        </div>
      )}
    </div>
  )
}
