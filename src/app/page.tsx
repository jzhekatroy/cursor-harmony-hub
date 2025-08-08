'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    teamName: '',
    contactPerson: '',
    slug: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [slugError, setSlugError] = useState('')
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [domain, setDomain] = useState('')
  const router = useRouter()

  // Функция транслитерации кириллицы в латиницу
  const transliterate = (text: string): string => {
    const translitMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
      'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    }
    
    return text.split('').map(char => translitMap[char] || char).join('')
  }

  // Устанавливаем домен после монтирования компонента
  useEffect(() => {
    setDomain(window.location.origin)
  }, [])

  // Автоматически генерируем slug при изменении названия салона
  useEffect(() => {
    if (formData.teamName && !isSlugManuallyEdited) {
      // Сначала транслитерируем кириллицу в латиницу
      const transliterated = transliterate(formData.teamName)
      
      // Затем генерируем slug из транслитерированного текста
      const generatedSlug = transliterated.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Убираем все кроме букв, цифр и пробелов
        .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
        .replace(/-+/g, '-') // Убираем множественные дефисы
        .replace(/^-|-$/g, '') // Убираем дефисы в начале и конце
      
      setFormData(prev => ({
        ...prev,
        slug: generatedSlug
      }))
      
      if (generatedSlug) {
        checkSlugAvailability(generatedSlug)
      }
    }
  }, [formData.teamName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Проверяем, есть ли ошибка с slug
    if (slugError) {
      setError('Исправьте ошибки в форме перед отправкой')
      return
    }
    
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
    const { name, value } = e.target
    
    if (name === 'teamName') {
      setFormData(prev => ({
        ...prev,
        teamName: value
      }))
    } else if (name === 'slug') {
      setFormData({
        ...formData,
        [name]: value
      })
      
      // Отмечаем, что пользователь редактировал slug вручную
      setIsSlugManuallyEdited(true)
      
      // Проверяем уникальность slug при ручном изменении
      if (value) {
        checkSlugAvailability(value)
      } else {
        setSlugError('')
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const checkSlugAvailability = async (slug: string) => {
    if (!slug) {
      setSlugError('')
      return
    }
    
    setIsCheckingSlug(true)
    setSlugError('')
    
    try {
      const response = await fetch(`/api/check-slug?slug=${encodeURIComponent(slug)}`)
      const data = await response.json()
      
      if (!response.ok) {
        setSlugError('Ошибка проверки доступности')
      } else if (!data.available) {
        setSlugError('Этот URL уже занят. Выберите другой.')
      }
    } catch (error) {
      setSlugError('Ошибка проверки доступности')
    } finally {
      setIsCheckingSlug(false)
    }
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
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                URL салона
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {domain || 'https://test.2minutes.ru'}/
                </span>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    required
                    value={formData.slug}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="my-salon"
                  />
                  {isCheckingSlug && (
                    <div className="absolute right-3 top-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
              </div>
              {slugError && (
                <p className="mt-1 text-sm text-red-600">
                  {slugError}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                URL будет автоматически сгенерирован из названия салона (кириллица переводится в латиницу). Вы можете изменить его вручную.
              </p>
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
              disabled={isLoading || !!slugError}
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
