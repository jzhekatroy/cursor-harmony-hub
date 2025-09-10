'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Search, Filter } from 'lucide-react'

interface TelegramLog {
  id: string
  level: string
  message: string
  data?: any
  createdAt: string
}

export default function TelegramWebAppLogsPage() {
  const [logs, setLogs] = useState<TelegramLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/superadmin/telegram-webapp-logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter(log => {
    const matchesFilter = !filter || 
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      JSON.stringify(log.data || {}).toLowerCase().includes(filter.toLowerCase())
    
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter
    
    return matchesFilter && matchesLevel
  })

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'destructive'
      case 'WARN': return 'secondary'
      case 'INFO': return 'default'
      case 'DEBUG': return 'outline'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Telegram WebApp Логи</h1>
        <Button onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Поиск по сообщению или данным</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Введите текст для поиска..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Уровень</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Все</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
                <option value="DEBUG">DEBUG</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Логи */}
      <Card>
        <CardHeader>
          <CardTitle>
            Логи ({filteredLogs.length} из {logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Загрузка логов...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Логи не найдены</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log, index) => (
                <div key={log.id} className="border-l-4 border-blue-200 pl-3 py-2 bg-gray-50 rounded-r">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getLevelColor(log.level)} className="text-xs">
                      {log.level}
                    </Badge>
                    <span className="text-xs text-gray-600">
                      {formatDate(log.createdAt)}
                    </span>
                    <span className="text-xs text-gray-400">#{filteredLogs.length - index}</span>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 mb-1">{log.message}</div>
                  
                  {log.data && (
                    <div className="mt-1">
                      <details className="cursor-pointer">
                        <summary className="text-xs text-blue-600 hover:text-blue-800">
                          Показать данные
                        </summary>
                        <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto border">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
