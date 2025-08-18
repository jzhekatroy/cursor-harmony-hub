"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
          router.push('/login')
          return
        }
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        if (!res.ok) {
          router.push('/login')
          return
        }
        const data = await res.json()
        if (data.role !== 'SUPER_ADMIN') {
          router.push('/login')
          return
        }
        setAllowed(true)
      } catch {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">Загрузка…</div>
    )
  }

  if (!allowed) {
    return null
  }
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col">
        <div className="h-14 px-4 flex items-center border-b border-gray-200 text-lg font-semibold">БОГ‑админка</div>
        <nav className="flex-1 p-3 text-sm">
          <div className="mb-2 px-2 text-xs uppercase text-gray-400">Разделы</div>
          <ul className="space-y-1">
            <li>
              <Link href="/superadmin" className="block px-3 py-2 rounded hover:bg-gray-50 text-gray-700">Команды</Link>
            </li>
            <li>
              <Link href="/superadmin/users" className="block px-3 py-2 rounded hover:bg-gray-50 text-gray-700">Пользователи</Link>
            </li>
            <li>
              <Link href="/superadmin/login-logs" className="block px-3 py-2 rounded hover:bg-gray-50 text-gray-700">Журнал входов</Link>
            </li>
          </ul>
        </nav>
        <div className="p-3 text-[11px] text-gray-400 border-t border-gray-100">© Admin</div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <main>{children}</main>
      </div>
    </div>
  )
}


