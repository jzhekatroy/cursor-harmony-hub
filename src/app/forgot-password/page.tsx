'use client'

import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Восстановление пароля</h1>
        <p className="text-gray-600">
          Страница в разработке. Если вы забыли пароль, свяжитесь с администратором команды.
        </p>
        <div>
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            ← Вернуться ко входу
          </Link>
        </div>
      </div>
    </div>
  )
}


