'use client'

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, durationMs?: number) => void
  success: (message: string, durationMs?: number) => void
  error: (message: string, durationMs?: number) => void
  info: (message: string, durationMs?: number) => void
  warning: (message: string, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Record<string, any>>({})

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
  }, [])

  const push = useCallback((message: string, type: ToastType = 'info', durationMs = 3000) => {
    const id = Math.random().toString(36).slice(2)
    const item: ToastItem = { id, message, type, duration: durationMs }
    setToasts(prev => [...prev, item])
    timersRef.current[id] = setTimeout(() => remove(id), durationMs)
  }, [remove])

  const value = useMemo<ToastContextValue>(() => ({
    show: (message, type = 'info', duration) => push(message, type, duration),
    success: (message, duration) => push(message, 'success', duration),
    error: (message, duration) => push(message, 'error', duration),
    info: (message, duration) => push(message, 'info', duration),
    warning: (message, duration) => push(message, 'warning', duration)
  }), [push])

  const color = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-600'
      case 'error': return 'bg-red-600'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-blue-600'
    }
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[1000] space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`text-white px-4 py-2 rounded shadow-md ${color(t.type)} max-w-xs`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 text-sm leading-snug">{t.message}</div>
              <button onClick={() => remove(t.id)} className="text-white/80 hover:text-white">×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}


