'use client'

import { useState, useEffect } from 'react'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'

interface DebugInfoProps {
  bookingData: {
    clientInfo: {
      firstName?: string
      lastName?: string
      name: string
      phone: string
      email?: string
      notes?: string
    }
  }
}

export function DebugInfo({ bookingData }: DebugInfoProps) {
  const telegramWebApp = useTelegramWebApp()
  const [isVisible, setIsVisible] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  useEffect(() => {
    if (telegramWebApp.isAvailable && telegramWebApp.user) {
      addLog('Telegram WebApp detected')
      
      const needsInitialization = !bookingData.clientInfo.firstName && 
                                !bookingData.clientInfo.lastName && 
                                telegramWebApp.user?.first_name
      
      addLog(`needsInitialization: ${needsInitialization}`)
      addLog(`firstName: "${bookingData.clientInfo.firstName}"`)
      addLog(`lastName: "${bookingData.clientInfo.lastName}"`)
      addLog(`telegramFirstName: "${telegramWebApp.user?.first_name}"`)
      addLog(`telegramLastName: "${telegramWebApp.user?.last_name}"`)
    }
  }, [telegramWebApp.isAvailable, telegramWebApp.user, bookingData.clientInfo.firstName, bookingData.clientInfo.lastName])

  if (!telegramWebApp.isAvailable) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-500 text-white px-3 py-2 rounded text-xs mb-2"
      >
        {isVisible ? 'Скрыть Debug' : 'Показать Debug'}
      </button>
      
      {isVisible && (
        <div className="bg-black bg-opacity-90 text-white p-3 rounded text-xs max-w-xs max-h-64 overflow-y-auto">
          <div className="font-bold mb-2">Debug Info:</div>
          {logs.map((log, index) => (
            <div key={index} className="mb-1 break-words">{log}</div>
          ))}
        </div>
      )}
    </div>
  )
}
