'use client'

import { useState, useEffect } from 'react'
import { Clock, Settings, Save } from 'lucide-react'

interface BookingSettingsProps {
  className?: string
}

interface TeamSettings {
  bookingStep: number
  masterLimit: number
  requireConfirmation: boolean
  webhooksEnabled: boolean
  privacyPolicyUrl?: string
  contactPerson: string
  email: string
  logoUrl?: string
}

export default function BookingSettings({ className = '' }: BookingSettingsProps) {
  const [settings, setSettings] = useState<TeamSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const bookingStepOptions = [
    { value: 15, label: '15 минут', description: '09:15, 09:30, 09:45...' },
    { value: 30, label: '30 минут', description: '09:30, 10:00, 10:30...' },
    { value: 60, label: '60 минут', description: '10:00, 11:00, 12:00...' }
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Токен авторизации отсутствует')
        return
      }

      const response = await fetch('/api/team/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки настроек')
      }

      const data = await response.json()
      setSettings(data.settings)

    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookingStepChange = async (newStep: number) => {
    if (!settings) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)
      
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/team/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookingStep: newStep
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка сохранения настроек')
      }

      const data = await response.json()
      setSettings(data.settings)
      setSuccessMessage('Интервал бронирования обновлен')
      
      // Убираем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccessMessage(null), 3000)
      
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      setError(error instanceof Error ? error.message : 'Ошибка сохранения настроек')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-5 h-5 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-300 rounded"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          Не удалось загрузить настройки
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900">Настройки бронирования</h3>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Интервал бронирования
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Определяет с каким шагом предлагать свободное время клиентам
        </p>
        
        <div className="space-y-3">
          {bookingStepOptions.map((option) => (
            <label key={option.value} className="flex items-start">
              <input
                type="radio"
                name="bookingStep"
                value={option.value}
                checked={settings.bookingStep === option.value}
                onChange={() => handleBookingStepChange(option.value)}
                disabled={isSaving}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">
                  {option.label}
                </div>
                <div className="text-sm text-gray-500">
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {isSaving && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Сохраняем настройки...
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <span>Текущий интервал:</span>
            <span className="font-medium text-gray-900">
              {settings.bookingStep} минут
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}