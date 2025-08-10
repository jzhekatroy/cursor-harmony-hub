'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestTimezonePage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [clientTimezone, setClientTimezone] = useState('Asia/Novosibirsk')

  const testTimezoneAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/masters/cme3yce79000asbivapxr76nh/available-slots?date=${new Date().toISOString().split('T')[0]}&duration=60&clientTimezone=${clientTimezone}`
      )
      const data = await response.json()
      setTestResult(data)
    } catch (error: any) {
      console.error('Ошибка тестирования:', error)
      setTestResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  // Автоматически запускаем API при изменении временной зоны
  useEffect(() => {
    if (clientTimezone) {
      testTimezoneAPI()
    }
  }, [clientTimezone])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Тест временных зон</h1>

        <Card>
          <CardHeader>
            <CardTitle>Тестирование API временных зон</CardTitle>
          </CardHeader>
          <CardContent>
                    <div className="mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Временная зона клиента:
            </label>
            <select
              value={clientTimezone}
              onChange={(e) => setClientTimezone(e.target.value)}
              className="max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Asia/Novosibirsk">Asia/Novosibirsk (текущая зона салона)</option>
              <option value="Europe/Moscow">Europe/Moscow (+4 часа)</option>
              <option value="Asia/Vladivostok">Asia/Vladivostok (+4 часа)</option>
              <option value="Asia/Yekaterinburg">Asia/Yekaterinburg (+2 часа)</option>
              <option value="Europe/London">Europe/London (-7 часов)</option>
              <option value="America/New_York">America/New_York (-12 часов)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (+2 часа)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Выберите временную зону клиента для тестирования конвертации времени
            </p>
          </div>
          
          <Button
            onClick={testTimezoneAPI}
            disabled={loading}
          >
            {loading ? 'Тестирую...' : 'Тестировать API'}
          </Button>
        </div>

            {testResult && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Результат:</h3>
                
                <div className="bg-gray-100 p-4 rounded">
                  <h4 className="font-medium mb-2">Основная информация:</h4>
                  <p><strong>Дата:</strong> {testResult.date}</p>
                  <p><strong>Мастер:</strong> {testResult.masterName}</p>
                  <p><strong>Временная зона салона:</strong> {testResult.timezoneInfo?.salon}</p>
                  <p><strong>Временная зона клиента:</strong> {testResult.timezoneInfo?.client}</p>
                  <p><strong>Разница:</strong> {testResult.timezoneInfo?.difference}ч</p>
                </div>

                <div className="bg-gray-100 p-4 rounded">
                  <h4 className="font-medium mb-2">Первые 3 слота:</h4>
                  {testResult.availableSlots?.slice(0, 3).map((slot: any, index: number) => (
                    <div key={index} className="mb-2 p-2 bg-white rounded">
                      <p><strong>Время клиента:</strong> {slot.time}</p>
                      <p><strong>Время салона:</strong> {slot.timezoneInfo?.salonTime}</p>
                      <p><strong>Информация:</strong> {slot.timezoneInfo?.timezoneInfo}</p>
                    </div>
                  ))}
                </div>

                <details className="bg-gray-100 p-4 rounded">
                  <summary className="font-medium cursor-pointer">Полный ответ API</summary>
                  <pre className="mt-2 text-xs overflow-auto bg-white p-2 rounded">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
