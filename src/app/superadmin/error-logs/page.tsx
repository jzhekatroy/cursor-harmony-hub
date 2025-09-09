'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

interface ErrorLog {
  id: string
  level: string
  message: string
  data: any
  url: string
  userAgent: string
  ip: string
  createdAt: string
  teamId: string | null
  clientId: string | null
}

export default function ErrorLogsPage() {
  const toast = useToast()
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchErrorLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Токен авторизации отсутствует')
      }
      
      const response = await fetch('/api/superadmin/error-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch error logs')
      }
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err: any) {
      setError(err.message)
      toast.error('Ошибка загрузки логов: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrorLogs()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600 bg-red-50'
      case 'WARN':
        return 'text-yellow-600 bg-yellow-50'
      case 'INFO':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const openLogDetails = (log: ErrorLog) => {
    setSelectedLog(log)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedLog(null)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Скопировано в буфер обмена!')
    } catch (err) {
      toast.error('Ошибка копирования')
    }
  }

  const formatLogData = (log: ErrorLog) => {
    return JSON.stringify({
      id: log.id,
      level: log.level,
      message: log.message,
      data: log.data,
      url: log.url,
      userAgent: log.userAgent,
      ip: log.ip,
      createdAt: log.createdAt,
      teamId: log.teamId,
      clientId: log.clientId
    }, null, 2)
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Загрузка логов ошибок...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Логи ошибок</h1>
        <button
          onClick={fetchErrorLogs}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Обновить
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Время
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Уровень
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сообщение
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {log.message}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {log.url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openLogDetails(log)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Логи ошибок не найдены
          </div>
        )}
      </div>

      {/* Модальное окно с деталями ошибки */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Детали ошибки
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(formatLogData(selectedLog))}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Копировать всё
                </button>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Содержимое */}
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                {/* Основная информация */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                    <div className="text-sm text-gray-900 font-mono">{selectedLog.id}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Уровень</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(selectedLog.level)}`}>
                      {selectedLog.level}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                    <div className="text-sm text-gray-900">{formatDate(selectedLog.createdAt)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP</label>
                    <div className="text-sm text-gray-900 font-mono">{selectedLog.ip}</div>
                  </div>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">
                    {selectedLog.url}
                  </div>
                </div>

                {/* Сообщение */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сообщение</label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedLog.message}
                  </div>
                </div>

                {/* User Agent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>

                {/* Данные ошибки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Данные ошибки</label>
                  <div className="relative">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.data, null, 2))}
                      className="absolute top-2 right-2 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                    >
                      Копировать
                    </button>
                    <pre className="text-xs text-gray-900 bg-gray-50 p-4 rounded overflow-auto max-h-96 border">
                      {JSON.stringify(selectedLog.data, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Полные данные */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Полные данные (JSON)</label>
                  <div className="relative">
                    <button
                      onClick={() => copyToClipboard(formatLogData(selectedLog))}
                      className="absolute top-2 right-2 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                    >
                      Копировать
                    </button>
                    <pre className="text-xs text-gray-900 bg-gray-50 p-4 rounded overflow-auto max-h-96 border">
                      {formatLogData(selectedLog)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Футер */}
            <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200">
              <button
                onClick={() => copyToClipboard(formatLogData(selectedLog))}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Копировать всё
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
