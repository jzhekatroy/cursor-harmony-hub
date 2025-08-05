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
  X
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
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    // TODO: Добавить валидацию токена через API
    // Пока используем заглушку
    const mockUser: User = {
      id: '1',
      email: 'admin@example.com',
      role: 'ADMIN',
      firstName: 'Админ',
      team: {
        id: '1',
        name: 'Beauty Salon',
        teamNumber: 'B0123456'
      }
    }
    setUser(mockUser)
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navigation = [
    { name: 'Календарь', href: '/admin', icon: Calendar },
    { name: 'Бронирования', href: '/admin/bookings', icon: BookOpen },
    { name: 'Клиенты', href: '/admin/clients', icon: Users },
    { name: 'Услуги', href: '/admin/services', icon: Scissors },
    { name: 'Мастера', href: '/admin/masters', icon: User },
    { name: 'Настройки', href: '/admin/settings', icon: Settings },
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
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 lg:hidden z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{user.team.name}</h1>
            <p className="text-sm text-gray-500">{user.team.teamNumber}</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Выйти
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="lg:hidden">
              <h1 className="text-lg font-semibold text-gray-900">{user.team.name}</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-gray-500">
                Роль: {user.role === 'ADMIN' ? 'Администратор' : 'Мастер'}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}