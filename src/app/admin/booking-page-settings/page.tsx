'use client'

import { useEffect, useState } from 'react'
import BookingLinkSettings from '@/components/BookingLinkSettings'
import BookingSettings from '@/components/BookingSettings'

interface TeamSettings {
  slug: string
  bookingSlug: string
  bookingStep: number
  fairMasterRotation?: boolean
  ungroupedGroupName?: string
}

export default function BookingPageSettings() {
  const [settings, setSettings] = useState<TeamSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/team/settings', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки настроек')
        setSettings(data.settings)
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateBookingSlug = async (bookingSlug: string) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingSlug })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Ошибка обновления ссылки')
    setSettings((prev) => prev ? { ...prev, bookingSlug: data.settings.bookingSlug } : prev)
  }

  // Редактирование названия раздела без группы перенесено в /admin/services

  const updateFairMasterRotation = async (fairMasterRotation: boolean) => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/team/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fairMasterRotation })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Ошибка обновления настройки распределения')
    setSettings((prev) => prev ? { ...prev, fairMasterRotation: data.settings.fairMasterRotation } : prev)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загружаем…</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700">{error || 'Ошибка'}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Настройки страницы записи</h1>

        <div className="space-y-6">
          {/* Название раздела без группы редактируется на странице услуг */}
          {/* Ссылка для онлайн записи */}
          <BookingLinkSettings
            currentSlug={settings.slug}
            currentBookingSlug={settings.bookingSlug}
            onUpdate={updateBookingSlug}
          />

          {/* Настройки бронирования */}
          <BookingSettings />

          {/* Справедливое распределение мастеров */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Справедливое распределение мастеров</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Включить справедливое распределение</label>
                  <p className="text-sm text-gray-600">Мастера будут появляться на разных позициях по очереди, выравнивая количество показов.</p>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      (settings.fairMasterRotation ?? false) ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    onClick={() => updateFairMasterRotation(!(settings.fairMasterRotation ?? false))}
                    aria-pressed={settings.fairMasterRotation ?? false}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        (settings.fairMasterRotation ?? false) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
              {(settings.fairMasterRotation ?? false) && (
                <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Как это работает:</strong> система выравнивает позиции показа мастеров (1-я, 2-я, 3-я и т.д.),
                    чтобы каждый мастер получал одинаковое количество показов на каждой позиции.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


