'use client'

import { useState, useEffect } from 'react'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugWebAppPage() {
  const telegramWebApp = useTelegramWebApp()
  const [logs, setLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const testRequestContact = async () => {
    addLog('🧪 Testing requestContact...')
    
    if (!telegramWebApp.webApp) {
      addLog('❌ WebApp not available')
      return
    }

    addLog(`📱 WebApp version: ${telegramWebApp.webApp.version}`)
    addLog(`📱 Platform: ${telegramWebApp.webApp.platform}`)
    addLog(`📱 requestContact type: ${typeof telegramWebApp.webApp.requestContact}`)
    addLog(`📱 requestWriteAccess type: ${typeof telegramWebApp.webApp.requestWriteAccess}`)

    if (typeof telegramWebApp.webApp.requestContact === 'function') {
      addLog('✅ requestContact method available')
      
      try {
        telegramWebApp.webApp.requestContact((granted: boolean, contact?: any) => {
          addLog(`📞 requestContact callback: granted=${granted}, contact=${JSON.stringify(contact)}`)
          setTestResults((prev: Record<string, any>) => ({
            ...prev,
            requestContact: { granted, contact, timestamp: new Date().toISOString() }
          }))
        })
      } catch (error) {
        addLog(`❌ requestContact error: ${error}`)
      }
    } else {
      addLog('❌ requestContact method not available')
    }
  }

  const testRequestWriteAccess = async () => {
    addLog('🧪 Testing requestWriteAccess...')
    
    if (!telegramWebApp.webApp) {
      addLog('❌ WebApp not available')
      return
    }

    if (typeof telegramWebApp.webApp.requestWriteAccess === 'function') {
      addLog('✅ requestWriteAccess method available')
      
      try {
        telegramWebApp.webApp.requestWriteAccess((granted: boolean) => {
          addLog(`📝 requestWriteAccess callback: granted=${granted}`)
          setTestResults((prev: Record<string, any>) => ({
            ...prev,
            requestWriteAccess: { granted, timestamp: new Date().toISOString() }
          }))
        })
      } catch (error) {
        addLog(`❌ requestWriteAccess error: ${error}`)
      }
    } else {
      addLog('❌ requestWriteAccess method not available')
    }
  }

  const clearLogs = () => {
    setLogs([])
    setTestResults({})
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔍 WebApp Debug Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button onClick={testRequestContact} className="w-full">
                🧪 Test requestContact
              </Button>
              <Button onClick={testRequestWriteAccess} className="w-full">
                🧪 Test requestWriteAccess
              </Button>
            </div>
            <Button onClick={clearLogs} variant="outline" className="w-full">
              🗑️ Clear Logs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 WebApp Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Available:</strong> {telegramWebApp.isAvailable ? '✅' : '❌'}</div>
              <div><strong>Ready:</strong> {telegramWebApp.isReady ? '✅' : '❌'}</div>
              <div><strong>User:</strong> {telegramWebApp.user ? '✅' : '❌'}</div>
              <div><strong>WebApp:</strong> {telegramWebApp.webApp ? '✅' : '❌'}</div>
              <div><strong>Platform:</strong> {telegramWebApp.platform || 'N/A'}</div>
              <div><strong>Version:</strong> {telegramWebApp.version || 'N/A'}</div>
              {telegramWebApp.user && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <div><strong>User ID:</strong> {telegramWebApp.user.id}</div>
                  <div><strong>Name:</strong> {telegramWebApp.user.first_name} {telegramWebApp.user.last_name}</div>
                  <div><strong>Username:</strong> {telegramWebApp.user.username || 'N/A'}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📝 Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
