'use client'

import { useState, useEffect } from 'react'

interface TelegramLog {
  id: string
  timestamp: string
  level: string
  message: string
  data: any
  url: string
  userAgent: string
  ip: string
  teamId: string
  clientId: string
}

export default function SuperAdminTelegramLogsPage() {
  const [logs, setLogs] = useState<TelegramLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    level: '',
    teamId: '',
    page: 1
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  
  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.level) params.set('level', filters.level)
      if (filters.teamId) params.set('teamId', filters.teamId)
      params.set('page', filters.page.toString())
      
      const response = await fetch(`/api/telegram/logs?${params}`)
      const data = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchLogs()
  }, [filters])
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'bg-red-100 text-red-800'
      case 'WARN': return 'bg-yellow-100 text-yellow-800'
      case 'INFO': return 'bg-blue-100 text-blue-800'
      case 'DEBUG': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📱 Telegram Logs (SuperAdmin)</h1>
      
      {/* Фильтры */}
      <div className="mb-6 flex gap-4 items-center">
        <select 
          value={filters.level}
          onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value, page: 1 }))}
          className="px-3 py-2 border rounded"
        >
          <option value="">Все уровни</option>
          <option value="INFO">INFO</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="DEBUG">DEBUG</option>
        </select>
        
        <input
          type="text"
          placeholder="Team ID"
          value={filters.teamId}
          onChange={(e) => setFilters(prev => ({ ...prev, teamId: e.target.value, page: 1 }))}
          className="px-3 py-2 border rounded"
        />
        
        <button 
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔄 Обновить
        </button>
        
        <div className="text-sm text-gray-600">
          Всего: {pagination.total} | Страница: {pagination.page} из {pagination.pages}
        </div>
      </div>
      
      {/* Таблица логов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Загрузка логов...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Уровень</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сообщение</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Данные</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                    <div className="truncate" title={log.message}>
                      {log.message}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.data && (
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          Показать данные
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-w-xs max-h-32">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ip}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate" title={log.url}>
                      {log.url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.teamId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {logs.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            Логи не найдены
          </div>
        )}
      </div>
      
      {/* Пагинация */}
      {pagination.pages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={filters.page <= 1}
            className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Предыдущая
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-600">
            {filters.page} из {pagination.pages}
          </span>
          
          <button
            onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
            disabled={filters.page >= pagination.pages}
            className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Следующая →
          </button>
        </div>
      )}
    </div>
  )
}
