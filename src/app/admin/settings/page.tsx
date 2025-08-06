'use client'

import { useState } from 'react'
import BookingSettings from '@/components/BookingSettings'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    teamName: 'Beauty Salon',
    contactEmail: 'salon@example.com',
    contactPhone: '+7 (999) 123-45-67',
    address: '',
    workingHours: '09:00-21:00',
    timeZone: 'Europe/Moscow',
    requireConfirmation: true,
    allowOnlinePayment: false,
    sendNotifications: true,
    language: 'ru'
  })

  const handleSave = () => {
    // В реальном приложении здесь будет API запрос
    alert('Настройки сохранены!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Настройки
            </h2>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {/* Настройки бронирования */}
          <BookingSettings />

          {/* Основная информация */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Основная информация</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Информация о вашем салоне, которая отображается клиентам.
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <label htmlFor="teamName" className="block text-sm font-medium text-gray-700">
                      Название салона
                    </label>
                    <input
                      type="text"
                      name="teamName"
                      id="teamName"
                      value={settings.teamName}
                      onChange={(e) => setSettings({...settings, teamName: e.target.value})}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      id="contactEmail"
                      value={settings.contactEmail}
                      onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                      Телефон
                    </label>
                    <input
                      type="tel"
                      name="contactPhone"
                      id="contactPhone"
                      value={settings.contactPhone}
                      onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Адрес
                    </label>
                    <input
                      type="text"
                      name="address"
                      id="address"
                      value={settings.address}
                      onChange={(e) => setSettings({...settings, address: e.target.value})}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Рабочие настройки */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Рабочие настройки</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Настройки работы салона и записей.
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="space-y-6">
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="workingHours" className="block text-sm font-medium text-gray-700">
                        Часы работы
                      </label>
                      <input
                        type="text"
                        name="workingHours"
                        id="workingHours"
                        value={settings.workingHours}
                        onChange={(e) => setSettings({...settings, workingHours: e.target.value})}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                        Часовой пояс
                      </label>
                      <select
                        id="timeZone"
                        name="timeZone"
                        value={settings.timeZone}
                        onChange={(e) => setSettings({...settings, timeZone: e.target.value})}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="Europe/Moscow">Москва (UTC+3)</option>
                        <option value="Europe/Kiev">Киев (UTC+2)</option>
                        <option value="Asia/Almaty">Алматы (UTC+6)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="requireConfirmation"
                          name="requireConfirmation"
                          type="checkbox"
                          checked={settings.requireConfirmation}
                          onChange={(e) => setSettings({...settings, requireConfirmation: e.target.checked})}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="requireConfirmation" className="font-medium text-gray-700">
                          Требовать подтверждение записей
                        </label>
                        <p className="text-gray-500">Записи будут требовать подтверждения администратором.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="allowOnlinePayment"
                          name="allowOnlinePayment"
                          type="checkbox"
                          checked={settings.allowOnlinePayment}
                          onChange={(e) => setSettings({...settings, allowOnlinePayment: e.target.checked})}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="allowOnlinePayment" className="font-medium text-gray-700">
                          Разрешить онлайн-оплату
                        </label>
                        <p className="text-gray-500">Клиенты смогут оплачивать услуги онлайн.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="sendNotifications"
                          name="sendNotifications"
                          type="checkbox"
                          checked={settings.sendNotifications}
                          onChange={(e) => setSettings({...settings, sendNotifications: e.target.checked})}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="sendNotifications" className="font-medium text-gray-700">
                          Отправлять уведомления
                        </label>
                        <p className="text-gray-500">Автоматические уведомления клиентам о записях.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end">
            <button
              type="button"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}