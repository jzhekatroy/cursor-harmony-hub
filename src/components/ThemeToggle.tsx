import React, { useEffect, useState } from 'react'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
      const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
      const wantDark = saved === 'dark' || (!saved && prefersDark)
      setIsDark(Boolean(wantDark))
      if (wantDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch {}
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    try {
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      // Оповещаем слушателей о смене темы
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark: next } }))
      }
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={className || ''}
      aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
    >
      <span className="inline-block align-middle text-sm px-3 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700">
        {isDark ? 'Светлая' : 'Тёмная'}
      </span>
    </button>
  )
}


