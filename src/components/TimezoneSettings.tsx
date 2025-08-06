'use client'

import React, { useState } from 'react'

interface TimezoneSettingsProps {
  currentTimezone: string
  onUpdate: (timezone: string) => Promise<void>
}

// Популярные часовые пояса для салонов красоты
const COMMON_TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)', offset: '+03:00' },
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)', offset: '+02:00' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)', offset: '+03:00' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)', offset: '+06:00' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)', offset: '+05:00' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)', offset: '+05:00' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)', offset: '+07:00' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)', offset: '+10:00' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)', offset: '+00:00' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)', offset: '-05:00' },
  { value: 'UTC', label: 'UTC (универсальное время)', offset: '+00:00' }
]

const TimezoneSettings: React.FC<TimezoneSettingsProps> = ({ 
  currentTimezone, 
  onUpdate 
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone)

  // Получаем текущее время в выбранном часовом поясе
  const getCurrentTimeInTimezone = (timezone: string) => {
    try {
      return new Date().toLocaleString('ru-RU', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch (error) {
      return 'Ошибка отображения времени'
    }
  }

  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone)
  }

  const handleSave = async () => {
    if (selectedTimezone === currentTimezone) return

    setIsLoading(true)
    try {
      await onUpdate(selectedTimezone)
    } catch (error) {
      console.error('Ошибка обновления часового пояса:', error)
      alert('Ошибка при сохранении настроек')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTimezoneInfo = COMMON_TIMEZONES.find(tz => tz.value === currentTimezone)
  const selectedTimezoneInfo = COMMON_TIMEZONES.find(tz => tz.value === selectedTimezone)

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">⏰ Часовой пояс салона</h3>
      
      {/* Текущий часовой пояс */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-gray-600">Текущий часовой пояс:</div>
        <div className="font-medium text-blue-800">
          {currentTimezoneInfo?.label || currentTimezone}
        </div>
        <div className="text-sm text-gray-500">
          Сейчас: {getCurrentTimeInTimezone(currentTimezone)}
        </div>
      </div>

      {/* Выбор нового часового пояса */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Выберите часовой пояс:
        </label>
        <select
          value={selectedTimezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {COMMON_TIMEZONES.map((timezone) => (
            <option key={timezone.value} value={timezone.value}>
              {timezone.label}
            </option>
          ))}
        </select>
      </div>

      {/* Предпросмотр выбранного времени */}
      {selectedTimezone !== currentTimezone && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="text-sm text-gray-600">Новый часовой пояс:</div>
          <div className="font-medium text-green-800">
            {selectedTimezoneInfo?.label || selectedTimezone}
          </div>
          <div className="text-sm text-gray-500">
            Время будет: {getCurrentTimeInTimezone(selectedTimezone)}
          </div>
        </div>
      )}

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading || selectedTimezone === currentTimezone}
          className={`px-4 py-2 rounded-md font-medium ${
            selectedTimezone === currentTimezone
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isLoading
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
          }`}
        >
          {isLoading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {/* Информация */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <div className="text-sm text-yellow-800">
          <strong>ℹ️ Важно:</strong> Изменение часового пояса повлияет на:
        </div>
        <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
          <li>Отображение доступных слотов для записи</li>
          <li>Рабочее время мастеров</li>
          <li>Время перерывов и отсутствий</li>
          <li>Отчеты и статистику</li>
        </ul>
      </div>
    </div>
  )
}

export default TimezoneSettings