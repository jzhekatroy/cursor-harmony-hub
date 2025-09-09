'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  Users, 
  User, 
  Scissors,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
  team: {
    id: string
    name: string
    teamNumber: string
    slug?: string
    bookingSlug?: string
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    // Получаем данные пользователя через API
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          console.error('Ошибка получения данных пользователя')
          localStorage.removeItem('token')
          router.push('/login')
        }
      } catch (error) {
        console.error('Ошибка запроса данных пользователя:', error)
        localStorage.removeItem('token')
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navigation = [
    { name: 'Календарь', href: '/admin', icon: Calendar },
    { name: 'Сводка по бронированиям', href: '/admin/bookings', icon: BookOpen },
    { name: 'Клиенты', href: '/admin/clients', icon: Users },
    { name: 'Услуги', href: '/admin/services', icon: Scissors },
    { name: 'Мастера', href: '/admin/masters', icon: User },
    { name: 'Настройки', href: '/admin/settings', icon: Settings },
    { name: 'Настройки страницы записи', href: '/admin/booking-page-settings', icon: BookOpen },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && (user as any).impersonatedBy && (
        <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-sm">
            <div>Impersonation: вы вошли как админ команды</div>
            <button
              className="px-2 py-1 border border-yellow-300 rounded hover:bg-yellow-200"
              onClick={() => {
                const original = sessionStorage.getItem('superadmin_original_token')
                if (original) {
                  localStorage.setItem('token', original)
                  sessionStorage.removeItem('superadmin_original_token')
                  window.location.reload()
                } else {
                  alert('Оригинальный токен не найден')
                }
              }}
            >Вернуться к SUPER_ADMIN</button>
          </div>
        </div>
      )}
      {/* Top header with horizontal navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{user.team.name}</h1>
                <p className="text-xs text-gray-500">{user.team.teamNumber}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Right side - Public page link + User menu */}
            <div className="flex items-center space-x-4">
              {/* Debug phone logs link */}
              <Link
                href="/debug-phone-logs"
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                📱 Логи телефона
              </Link>

              {/* User info and logout */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user.role === 'ADMIN' ? 'Администратор' : 'Мастер'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Выйти</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-50"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
                
                {/* Mobile debug phone logs link */}
                <Link
                  href="/debug-phone-logs"
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <MessageSquare className="w-4 h-4 mr-3" />
                  📱 Логи телефона
                </Link>
                
                {/* Mobile public page link */}
                {user.team.slug && (
                  <Link
                    href={`/book/${user.team.bookingSlug || user.team.slug}`}
                    target="_blank"
                    className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <ExternalLink className="w-4 h-4 mr-3" />
                    Страница записи
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}