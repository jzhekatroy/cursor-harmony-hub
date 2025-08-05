'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    teamName: '',
    contactPerson: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Сохраняем токен в localStorage
        localStorage.setItem('token', data.token)
        // Перенаправляем в админку команды
        router.push('/admin')
      } else {
        setError(data.error || 'Ошибка регистрации')
      }
    } catch (error) {
      setError('Ошибка соединения с сервером')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Beauty Booking v1.1
          </h1>
          <p className="text-gray-600">
            Система записи на бьюти-услуги (Версия 1.2)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Регистрация новой команды
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                Название салона
              </label>
              <input
                type="text"
                id="teamName"
                name="teamName"
                required
                value={formData.teamName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Название вашего салона"
              />
            </div>

            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                Контактное лицо
              </label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                required
                value={formData.contactPerson}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ваше имя"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Минимум 6 символов"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              {isLoading ? 'Создание...' : 'Создать команду'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Войти
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500">
          <Link href="/super-admin" className="hover:text-gray-700">
            Администрирование системы
          </Link>
        </div>
      </div>
    </div>
  )
}
