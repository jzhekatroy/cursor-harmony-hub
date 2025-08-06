'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'

interface BookingLinkSettingsProps {
  currentSlug: string
  currentBookingSlug: string
  onUpdate: (bookingSlug: string) => Promise<void>
}

export default function BookingLinkSettings({ 
  currentSlug, 
  currentBookingSlug, 
  onUpdate 
}: BookingLinkSettingsProps) {
  const [bookingSlug, setBookingSlug] = useState(currentBookingSlug)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setBookingSlug(currentBookingSlug)
  }, [currentBookingSlug])

  const handleSave = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      await onUpdate(bookingSlug)
      setSuccess('Ссылка обновлена!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setBookingSlug(currentSlug)
    setError(null)
    setSuccess(null)
  }

  const copyLink = async () => {
    const link = `${window.location.origin}/book/${bookingSlug}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Ошибка копирования:', err)
    }
  }

  const bookingLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://test.2minutes.ru'}/book/${bookingSlug}`
  const hasChanges = bookingSlug !== currentBookingSlug

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Ссылка для онлайн записи
      </h3>
      
      <div className="space-y-4">
        {/* Текущая ссылка */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ваша ссылка для записи:
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-gray-50 rounded-md border text-sm font-mono text-gray-800">
              {bookingLink}
            </div>
            <button
              onClick={copyLink}
              className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Скопировать ссылку"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <a
              href={bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Открыть в новой вкладке"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Настройка slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Изменить ссылку:
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {typeof window !== 'undefined' ? window.location.origin : 'https://test.2minutes.ru'}/book/
            </span>
            <input
              type="text"
              value={bookingSlug}
              onChange={(e) => setBookingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={currentSlug}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Только латинские буквы, цифры и дефисы. Оставьте пустым для использования основной ссылки.
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isLoading || !hasChanges
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
            
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Отменить
              </button>
            )}
          </div>

          {copied && (
            <span className="text-sm text-green-600 font-medium">
              Ссылка скопирована!
            </span>
          )}
        </div>

        {/* Сообщения */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}
      </div>
    </div>
  )
}