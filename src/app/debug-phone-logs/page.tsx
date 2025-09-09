'use client'

import { useState, useEffect } from 'react'

interface PhoneLog {
  id: string
  message: string
  data?: any
  timestamp: string
}

export default function DebugPhoneLogsPage() {
  const [logs, setLogs] = useState<PhoneLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/telegram/logs?type=phone')
      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }
      const data = await response.json()
      setLogs(data.logs || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchLogs, 2000) // Обновляем каждые 2 секунды
    return () => clearInterval(interval)
  }, [autoRefresh])

  const clearLogs = async () => {
    try {
      await fetch('/api/telegram/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'phone' })
      })
      setLogs([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs')
    }
  }

  const getLogColor = (message: string) => {
    if (message.includes('SUCCESS')) return 'text-green-600'
    if (message.includes('ERROR') || message.includes('FAILED')) return 'text-red-600'
    if (message.includes('TIMEOUT')) return 'text-yellow-600'
    if (message.includes('START')) return 'text-blue-600'
    return 'text-gray-600'
  }

  const getLogIcon = (message: string) => {
    if (message.includes('SUCCESS')) return '✅'
    if (message.includes('ERROR') || message.includes('FAILED')) return '❌'
    if (message.includes('TIMEOUT')) return '⏰'
    if (message.includes('START')) return '🚀'
    return '📝'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📱 Логи получения номера телефона
              </h1>
              <p className="text-gray-600 mt-1">
                Отладка запроса контакта через Telegram WebApp
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-md font-medium ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? '🔄 Автообновление' : '⏸️ Остановлено'}
              </button>
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md font-medium hover:bg-blue-200"
              >
                🔄 Обновить
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md font-medium hover:bg-red-200"
              >
                🗑️ Очистить
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Загрузка логов...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">❌</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Ошибка загрузки</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && logs.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет логов</h3>
              <p className="text-gray-600">
                Логи появятся здесь, когда вы попробуете получить номер телефона
              </p>
            </div>
          )}

          {!isLoading && !error && logs.length > 0 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Всего логов: {logs.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    Последнее обновление: {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="bg-white border border-gray-200 rounded-md p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getLogIcon(log.message)}</span>
                          <span className={`font-medium ${getLogColor(log.message)}`}>
                            {log.message}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {log.data && (
                          <div className="mt-2">
                            <details className="group">
                              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                                📋 Данные (нажмите для просмотра)
                              </summary>
                              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              💡 Как использовать эту страницу
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Откройте страницу записи в Telegram WebApp</li>
              <li>• Нажмите кнопку "Получить из Telegram"</li>
              <li>• Следите за логами в реальном времени на этой странице</li>
              <li>• Логи покажут, что именно происходит при запросе контакта</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}