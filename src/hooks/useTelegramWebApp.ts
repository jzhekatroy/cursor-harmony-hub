'use client'

import { useState, useEffect } from 'react'

// Типы для Telegram Web App
interface TelegramUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  added_to_attachment_menu?: boolean
  allows_write_to_pm?: boolean
  photo_url?: string
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: TelegramUser
    receiver?: TelegramUser
    chat?: any
    chat_type?: string
    chat_instance?: string
    start_param?: string
    can_send_after?: number
    auth_date: number
    hash: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  isVerticalSwipesEnabled: boolean

  // Методы
  ready(): void
  expand(): void
  close(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  enableClosingConfirmation(): void
  disableClosingConfirmation(): void
  enableVerticalSwipes(): void
  disableVerticalSwipes(): void
  onEvent(eventType: string, eventHandler: (...args: any[]) => void): void
  offEvent(eventType: string, eventHandler: (...args: any[]) => void): void
  sendData(data: string): void
  switchInlineQuery(query: string, choose_chat_types?: string[]): void
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink(url: string): void
  openInvoice(url: string, callback?: (status: string) => void): void
  showPopup(params: {
    title?: string
    message: string
    buttons?: Array<{
      id?: string
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
      text: string
    }>
  }, callback?: (buttonId: string) => void): void
  showAlert(message: string, callback?: () => void): void
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void
  showScanQrPopup(params: { text?: string }, callback?: (text: string) => void): void
  closeScanQrPopup(): void
  readTextFromClipboard(callback?: (text: string) => void): void
  requestWriteAccess(callback?: (granted: boolean) => void): void
  requestContact(): void
  isVersionAtLeast(version: string): boolean
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramClient {
  id: string
  telegramId: string
  firstName: string
  lastName: string
  email: string
  source: string
}

interface TelegramWebAppData {
  isAvailable: boolean
  isReady: boolean
  user: TelegramUser | null
  webApp: TelegramWebApp | null
  startParam: string | null
  platform: string | null
  version: string | null
  colorScheme: 'light' | 'dark' | null
  themeParams: any
  client: TelegramClient | null
  logs: string[]
}

export const useTelegramWebApp = () => {
  const [data, setData] = useState<TelegramWebAppData>({
    isAvailable: false,
    isReady: false,
    user: null,
    webApp: null,
    startParam: null,
    platform: null,
    version: null,
    colorScheme: null,
    themeParams: {},
    client: null,
    logs: []
  })

  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}`
    
    console.log('🤖 Telegram WebApp:', logMessage, data || '')
    
    setData(prev => ({
      ...prev,
      logs: [...prev.logs, logMessage + (data ? ` | Data: ${JSON.stringify(data)}` : '')]
    }))

    // Отправляем логи на сервер для отладки
    if (typeof window !== 'undefined') {
      fetch('/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: logMessage,
          data: data || null,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(console.error)
    }
  }

  useEffect(() => {
    addLog('🚀 useTelegramWebApp hook initialized')

    // Проверяем наличие Telegram Web App
    if (typeof window === 'undefined') {
      addLog('❌ Window is undefined (SSR)')
      return
    }

    addLog('🌐 Window available, checking Telegram WebApp')
    addLog('🔍 User Agent:', { userAgent: navigator.userAgent })
    addLog('🔍 Window.Telegram:', { exists: !!window.Telegram })
    
    // Проверяем наличие Telegram в user agent
    const isTelegramUserAgent = /Telegram/i.test(navigator.userAgent)
    addLog('🔍 Telegram in User Agent:', { isTelegramUserAgent })

    const checkTelegram = () => {
      addLog('🔄 Checking Telegram WebApp availability...')
      
      if (window.Telegram) {
        addLog('✅ window.Telegram found', {
          WebApp: !!window.Telegram.WebApp,
          keys: Object.keys(window.Telegram)
        })
      } else {
        addLog('❌ window.Telegram not found')
      }

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp
        addLog('✅ Telegram WebApp detected', {
          version: tg.version,
          platform: tg.platform,
          isExpanded: tg.isExpanded,
          viewportHeight: tg.viewportHeight
        })

        // Инициализируем WebApp
        tg.ready()
        addLog('📱 WebApp.ready() called')

        // Расширяем приложение
        tg.expand()
        addLog('📏 WebApp.expand() called')

        // Логируем сначала все данные для диагностики
        addLog('🔍 Raw initData string', { initData: tg.initData })
        addLog('📊 Full initDataUnsafe', { data: tg.initDataUnsafe })
        addLog('🌐 URL info', { 
          href: window.location.href,
          search: window.location.search,
          hash: window.location.hash
        })

        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user
        if (user) {
          addLog('👤 User data received', {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
            is_premium: user.is_premium
          })
        } else {
          addLog('👤 No user data available')
          addLog('🔍 Possible reasons:', {
            noInitData: !tg.initData || tg.initData === '',
            emptyInitDataUnsafe: Object.keys(tg.initDataUnsafe || {}).length === 0,
            botSetupIssue: 'Bot may not be passing user data correctly',
            testInBrowser: 'Are you testing in actual Telegram or just browser?'
          })
        }

        // Получаем параметры запуска
        const startParam = tg.initDataUnsafe?.start_param
        if (startParam) {
          addLog('🔗 Start param received', { startParam })
        } else {
          addLog('🔗 No start param found')
        }

        // Логируем тему
        addLog('🎨 Theme params', {
          colorScheme: tg.colorScheme,
          themeParams: tg.themeParams
        })

        // Устанавливаем данные
        setData(prev => ({
          ...prev,
          isAvailable: true,
          isReady: true,
          user: user || null,
          webApp: tg,
          startParam: startParam || null,
          platform: tg.platform,
          version: tg.version,
          colorScheme: tg.colorScheme,
          themeParams: tg.themeParams
        }))

        // Настраиваем обработчики событий
        const handleViewportChanged = () => {
          addLog('📐 Viewport changed', {
            height: tg.viewportHeight,
            stableHeight: tg.viewportStableHeight,
            isExpanded: tg.isExpanded
          })
        }

        const handleThemeChanged = () => {
          addLog('🎨 Theme changed', {
            colorScheme: tg.colorScheme,
            themeParams: tg.themeParams
          })
        }

        tg.onEvent('viewportChanged', handleViewportChanged)
        tg.onEvent('themeChanged', handleThemeChanged)

        addLog('🎯 Event listeners attached')

        // Отправляем данные о запуске на сервер
        fetch('/api/telegram/webapp-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: user,
            startParam: startParam,
            platform: tg.platform,
            version: tg.version,
            initData: tg.initData,
            url: window.location.href,
            timestamp: new Date().toISOString()
          })
        })
        .then(response => response.json())
        .then(data => {
          addLog('✅ WebApp start data sent', { 
            success: data.success,
            clientCreated: !!data.client,
            salonId: data.salon_id
          })
          
          // Обновляем данные с информацией о клиенте
          if (data.client) {
            setData(prev => ({
              ...prev,
              client: data.client
            }))
          }
        })
        .catch(error => {
          addLog('❌ Failed to send start data to server', { error: error.message })
        })

      } else {
        addLog('❌ Telegram WebApp not available')
        
        // Проверяем загрузку скрипта
        const scripts = Array.from(document.scripts)
        const telegramScript = scripts.find(s => s.src.includes('telegram-web-app.js'))
        addLog('🔍 Script check:', {
          telegramScriptFound: !!telegramScript,
          scriptSrc: telegramScript?.src,
          totalScripts: scripts.length
        })
        
        // Проверяем через некоторое время (возможно, скрипт еще загружается)
        let retryCount = 0
        const maxRetries = 5
        
        const retryCheck = () => {
          retryCount++
          addLog(`🔄 Retry ${retryCount}/${maxRetries}`)
          
          if (window.Telegram?.WebApp) {
            addLog('✅ Telegram WebApp found on retry')
            checkTelegram()
          } else if (retryCount < maxRetries) {
            setTimeout(retryCheck, 1000)
          } else {
            addLog('❌ Telegram WebApp still not available after all retries')
            addLog('🔍 Final state:', {
              windowTelegram: !!window.Telegram,
              webApp: !!window.Telegram?.WebApp,
              userAgent: navigator.userAgent
            })
            setData(prev => ({
              ...prev,
              isAvailable: false,
              isReady: true
            }))
          }
        }
        
        setTimeout(retryCheck, 1000)
      }
    }

    checkTelegram()
  }, [])

  const sendDataToBot = (data: any) => {
    if (!data.webApp) {
      addLog('❌ Cannot send data - WebApp not available')
      return
    }

    try {
      const jsonData = JSON.stringify(data)
      data.webApp.sendData(jsonData)
      addLog('📤 Data sent to bot', data)
    } catch (error: any) {
      addLog('❌ Failed to send data to bot', { error: error.message })
    }
  }

  const showAlert = (message: string) => {
    if (!data.webApp) {
      alert(message)
      return
    }

    data.webApp.showAlert(message, () => {
      addLog('💬 Alert closed', { message })
    })
  }

  const showConfirm = (message: string, callback: (confirmed: boolean) => void) => {
    if (!data.webApp) {
      const result = confirm(message)
      callback(result)
      return
    }

    data.webApp.showConfirm(message, (confirmed) => {
      addLog('❓ Confirm result', { message, confirmed })
      callback(confirmed)
    })
  }

  const close = () => {
    if (data.webApp) {
      addLog('🚪 Closing WebApp')
      data.webApp.close()
    }
  }

  return {
    ...data,
    sendDataToBot,
    showAlert,
    showConfirm,
    close,
    addLog
  }
}