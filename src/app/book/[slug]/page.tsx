'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
// ProgressIndicator убран по требованию дизайна
import { EnhancedServiceSelection } from '@/components/EnhancedServiceSelection'
import { EnhancedDateMasterTimeSelection } from '@/components/EnhancedDateMasterTimeSelection'
import { EnhancedClientInfoAndConfirmation } from '@/components/EnhancedClientInfoAndConfirmation'
import { DebugInfo } from '@/components/DebugInfo'
import { Service, ServiceGroup, Master, TimeSlot, BookingData, BookingStep, ClientInfo } from '@/types/booking'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface TeamData {
  team: {
    id: string
    name: string
    logoUrl?: string
    privacyPolicyUrl?: string
    slug: string
    bookingStep: number
    timezone: string
    publicServiceCardsWithPhotos?: boolean
    publicTheme?: 'light' | 'dark'
    publicPageTitle?: string
    publicPageDescription?: string
    publicPageLogoUrl?: string
  }
  serviceGroups: any[]
  ungroupedServices: any[]
  masters: any[]
}

export default function BookingWidget() {
  const params = useParams()
  const slug = params?.slug as string
  const telegramWebApp = useTelegramWebApp()

  const [currentStep, setCurrentStep] = useState<BookingStep>('select-services')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamData | null>(null)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [masters, setMasters] = useState<Master[]>([])
  const [isDarkLocal, setIsDarkLocal] = useState(false)
  const [showImagesByTeam, setShowImagesByTeam] = useState<boolean>(true)

  const [bookingData, setBookingData] = useState<BookingData>({
    services: [],
    date: '',
    master: null,
    timeSlot: null,
    clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
    totalPrice: 0,
    totalDuration: 0,
  })

  // Состояния для инициализации клиента
  const [isLoadingClient, setIsLoadingClient] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [existingClient, setExistingClient] = useState<any>(null)

  // Загрузка данных
  useEffect(() => {
    loadInitialData()
  }, [slug])

  // Инициализация данных клиента при загрузке WebApp
  useEffect(() => {
    console.log(`🔄 Parent useEffect triggered:
      isAvailable: ${telegramWebApp.isAvailable}
      userId: ${telegramWebApp.user?.id}
      isLoadingClient: ${isLoadingClient}
      isInitialized: ${isInitialized}
      user: ${JSON.stringify(telegramWebApp.user, null, 2)}`)
    
    // Отправляем лог на сервер для диагностики
    fetch('/api/telegram/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'INFO',
        message: 'PARENT_USE_EFFECT_TRIGGERED',
        data: {
          isAvailable: telegramWebApp.isAvailable,
          userId: telegramWebApp.user?.id,
          isLoadingClient: isLoadingClient,
          isInitialized: isInitialized,
          timestamp: new Date().toISOString()
        }
      })
    }).catch(e => console.error('Failed to send log:', e))
    
    // Проверяем, нужно ли инициализировать поля
    const needsInitialization = !bookingData.clientInfo.firstName && !bookingData.clientInfo.lastName && 
                                !!telegramWebApp.user?.first_name
    
    console.log(`🔍 Parent needsInitialization check:
      firstName: "${bookingData.clientInfo.firstName}"
      lastName: "${bookingData.clientInfo.lastName}"
      telegramFirstName: "${telegramWebApp.user?.first_name}"
      telegramLastName: "${telegramWebApp.user?.last_name}"
      needsInitialization: ${needsInitialization}`)
    
    if (!telegramWebApp.isAvailable || !telegramWebApp.user?.id || !needsInitialization) {
      console.log(`❌ Parent useEffect skipped:
        isAvailable: ${telegramWebApp.isAvailable}
        userId: ${telegramWebApp.user?.id}
        isLoadingClient: ${isLoadingClient}
        needsInitialization: ${needsInitialization}
        currentFirstName: ${bookingData.clientInfo.firstName}
        currentLastName: ${bookingData.clientInfo.lastName}
        REASON: ${!telegramWebApp.isAvailable ? 'not available' : 
                 !telegramWebApp.user?.id ? 'no user id' : 
                 isLoadingClient ? 'loading client' : 
                 !needsInitialization ? 'no need init' : 'unknown'}`)
      
      // Отправляем лог на сервер о том, что useEffect пропущен
      fetch('/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'WARN',
          message: 'PARENT_USE_EFFECT_SKIPPED',
          data: {
            isAvailable: telegramWebApp.isAvailable,
            userId: telegramWebApp.user?.id,
            isLoadingClient: isLoadingClient,
            needsInitialization: needsInitialization,
            currentFirstName: bookingData.clientInfo.firstName,
            currentLastName: bookingData.clientInfo.lastName,
            timestamp: new Date().toISOString()
          }
        })
      }).catch(e => console.error('Failed to send log:', e))
      return
    }

    const fetchExistingClient = async () => {
      console.log(`🔍 Parent fetchExistingClient called:
        isAvailable: ${telegramWebApp.isAvailable}
        userId: ${telegramWebApp.user?.id}
        isLoadingClient: ${isLoadingClient}
        isInitialized: ${isInitialized}`)
      
      // Отправляем лог на сервер для диагностики
      fetch('/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'PARENT_FETCH_EXISTING_CLIENT_CALLED',
          data: {
            isAvailable: telegramWebApp.isAvailable,
            userId: telegramWebApp.user?.id,
            isLoadingClient: isLoadingClient,
            isInitialized: isInitialized,
            timestamp: new Date().toISOString()
          }
        })
      }).catch(e => console.error('Failed to send log:', e))

      setIsLoadingClient(true)
      
      // Отправляем лог на сервер о начале выполнения
      fetch('/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'INFO',
          message: 'PARENT_FETCH_EXISTING_CLIENT_STARTING',
          data: {
            telegramId: telegramWebApp.user?.id,
            timestamp: new Date().toISOString()
          }
        })
      }).catch(e => console.error('Failed to send log:', e))
      
           try {
             const teamSlug = window.location.pathname.split('/')[2]
             console.log(`🔍 Parent Fetching client for:
               telegramId: ${telegramWebApp.user?.id}
               teamSlug: ${teamSlug}`)
             
             const response = await fetch(`/api/telegram/client?telegramId=${telegramWebApp.user?.id}&teamSlug=${teamSlug}`)
             
             console.log(`📡 Parent API response:
               status: ${response.status}
               ok: ${response.ok}
               statusText: ${response.statusText}`)
             
             if (response.ok) {
               const data = await response.json()
               console.log(`📦 Parent Client data received:
                 ${JSON.stringify(data, null, 2)}`)
               setExistingClient(data.client)
          
          // Инициализируем поля на основе найденного клиента или Telegram данных
          if (data.client) {
            // Клиент найден - используем данные из БД
            const firstName = data.client.firstName || telegramWebApp.user?.first_name || ''
            const lastName = data.client.lastName || telegramWebApp.user?.last_name || ''
            const fullName = `${firstName} ${lastName}`.trim()
            
            console.log(`✅ Parent Client found in DB, using DB data:
              firstName: ${firstName}
              lastName: ${lastName}
              fullName: ${fullName}`)
            
            const newClientInfo = {
              ...bookingData.clientInfo,
              name: fullName,
              firstName: data.client.firstName || telegramWebApp.user?.first_name || '',
              lastName: data.client.lastName || telegramWebApp.user?.last_name || '',
              phone: data.client.phone || bookingData.clientInfo.phone,
              email: data.client.email || bookingData.clientInfo.email
            }
            
            console.log(`📝 Parent Calling setBookingData with:
              ${JSON.stringify(newClientInfo, null, 2)}`)
            setBookingData(prev => ({ ...prev, clientInfo: newClientInfo }))
            
            // Отправляем лог на сервер
            fetch('/api/telegram/logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                level: 'INFO',
                message: 'PARENT_CLIENT_FOUND_IN_DB',
                data: { 
                  clientId: data.client.id,
                  firstName: newClientInfo.firstName,
                  lastName: newClientInfo.lastName,
                  fullName: newClientInfo.name,
                  timestamp: new Date().toISOString()
                }
              })
            }).catch(e => console.error('Failed to send log:', e))
          } else {
            // Клиент не найден - используем данные из Telegram
            const firstName = telegramWebApp.user?.first_name || ''
            const lastName = telegramWebApp.user?.last_name || ''
            const fullName = `${firstName} ${lastName}`.trim()
            
            console.log(`✅ Parent Client not found in DB, using Telegram data:
              firstName: ${firstName}
              lastName: ${lastName}
              fullName: ${fullName}`)
            
            if (fullName) {
              const newClientInfo = {
                ...bookingData.clientInfo,
                name: fullName,
                firstName: firstName,
                lastName: lastName
              }
              
              console.log(`📝 Parent Calling setBookingData with:
                ${JSON.stringify(newClientInfo, null, 2)}`)
              setBookingData(prev => ({ ...prev, clientInfo: newClientInfo }))
              
              // Отправляем лог на сервер
              fetch('/api/telegram/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  level: 'INFO',
                  message: 'PARENT_CLIENT_NOT_FOUND_USING_TELEGRAM',
                  data: { 
                    firstName: newClientInfo.firstName,
                    lastName: newClientInfo.lastName,
                    fullName: newClientInfo.name,
                    timestamp: new Date().toISOString()
                  }
                })
              }).catch(e => console.error('Failed to send log:', e))
            }
          }
             } else {
               const errorText = await response.text()
               console.log(`❌ Parent Failed to fetch client data:
                 status: ${response.status}
                 statusText: ${response.statusText}
                 error: ${errorText}`)
             }
      } catch (error) {
        console.error('Parent Error fetching existing client:', error)
      } finally {
        setIsLoadingClient(false)
        setIsInitialized(true)
      }
    }

    fetchExistingClient()
  }, [telegramWebApp.isAvailable, telegramWebApp.user?.id, bookingData.clientInfo.firstName, bookingData.clientInfo.lastName])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // Загружаем данные команды
      const teamResponse = await fetch(`/api/teams/${slug}`)
      if (!teamResponse.ok) {
        throw new Error('Команда не найдена')
      }
      const teamData = await teamResponse.json()
      
      setTeam(teamData)
      // Применяем публичные настройки UX
      try {
        const usePhotos = Boolean(teamData?.team?.publicServiceCardsWithPhotos ?? true)
        const theme = (teamData?.team?.publicTheme as string) || 'light'
        setShowImagesByTeam(usePhotos)
        setIsDarkLocal(theme === 'dark')
        if (typeof window !== 'undefined') {
          // Жёстко выставляем класс и data-theme
          const isDark = theme === 'dark'
          document.documentElement.classList[isDark ? 'add' : 'remove']('dark')
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
        }
      } catch {}

      // Загружаем группы услуг (публичный API)
      const servicesResponse = await fetch(`/api/teams/${slug}/services`)
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        setServiceGroups(servicesData)
      }

      // Загружаем мастеров (публичный API)
      const mastersResponse = await fetch(`/api/teams/${slug}/masters`)
      if (mastersResponse.ok) {
        const mastersData = await mastersResponse.json()
        setMasters(mastersData)
      }
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setError(error instanceof Error ? error.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  // Навигация по шагам
  const goToStep = (step: BookingStep) => {
    setCurrentStep(step)
  }

  const handleNext = () => {
    switch (currentStep) {
      case 'select-services':
        if (bookingData.services.length > 0) {
          goToStep('select-date-time')
        } else {
          alert('Пожалуйста, выберите хотя бы одну услугу.')
        }
        break
      case 'select-date-time':
        if (bookingData.date && bookingData.master && bookingData.timeSlot) {
          goToStep('client-info')
        } else {
          alert('Пожалуйста, выберите дату, мастера и время.')
        }
        break
      case 'client-info':
        // Финальный шаг - обработка в компоненте EnhancedClientInfoAndConfirmation
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'select-date-time':
        goToStep('select-services')
        break
      case 'client-info':
        goToStep('select-date-time')
        break
    }
  }

  const handleServiceSelect = (services: Service[]) => {
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0)
    setBookingData(prev => ({ ...prev, services, totalDuration, totalPrice }))
  }

  const handleDateTimeSelect = (date: string, master: Master | null, timeSlot: TimeSlot | null) => {
    setBookingData(prev => ({ ...prev, date, master, timeSlot }))
  }

  const handleClientInfoChange = (info: ClientInfo) => {
    setBookingData(prev => ({ ...prev, clientInfo: info }))
  }

  const handleBookingConfirmed = () => {
    // После успешного бронирования, можно сбросить данные или показать сообщение
    alert('Ваша запись успешно создана!')
    setBookingData({
      services: [],
      date: '',
      master: null,
      timeSlot: null,
      clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
      totalPrice: 0,
      totalDuration: 0,
    })
    setCurrentStep('select-services') // Вернуться к началу
  }

  // Публичная страница: тема берётся из настроек команды, слушатели не нужны

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00acf4] mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-red-200 flex items-center justify-center">
        <Card className="p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Ошибка</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={loadInitialData} className="bg-red-500 hover:bg-red-600 text-white">
            Повторить попытку
          </Button>
        </Card>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-red-200 flex items-center justify-center">
        <Card className="p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Салон не найден</h2>
          <p className="text-red-600 mb-6">
            К сожалению, салон с адресом "{slug}" не найден. Проверьте правильность ссылки.
          </p>
          {/* Отладочная информация */}
          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mt-4">
            <div>DEBUG: slug = {slug}</div>
            <div>DEBUG: loading = {loading.toString()}</div>
            <div>DEBUG: error = {error || 'null'}</div>
          </div>
        </Card>
      </div>
    )
  }



  // Отдельный лейаут для шага выбора услуг — как в архиве (без Card, ограниченная ширина)
  if (currentStep === 'select-services') {
    return (
      <div className={isDarkLocal ? 'min-h-screen bg-neutral-800/30 text-neutral-100' : 'min-h-screen bg-slate-50/80 text-foreground'}>
        <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-l-2 border-r-2 min-h-screen ${isDarkLocal ? 'border-gray-600' : 'border-gray-200'}`}>
          {/* Header with logo and salon description - верхняя часть с теплым тоном */}
          <div className={`text-center mb-12 rounded-2xl p-8 ${isDarkLocal ? 'bg-neutral-800/50' : 'bg-amber-50/80'}`}>
            <div className="mb-8">
              {/* Логотип */}
              <div className="w-24 h-24 mx-auto bg-primary rounded-full flex items-center justify-center mb-6 overflow-hidden">
                {team?.team?.publicPageLogoUrl ? (
                  <img
                    src={team.team.publicPageLogoUrl}
                    alt={`${team.team.publicPageTitle || team.team.name} Logo`}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <span className="text-primary-foreground text-2xl">
                    {(team?.team?.publicPageTitle || team?.team?.name || 'B').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Название салона */}
              <h1 className="mb-6">
                {team?.team?.publicPageTitle || team?.team?.name || 'BEAUTY SALON'}
              </h1>
              
              {/* Описание салона */}
              {team?.team?.publicPageDescription && (
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {team.team.publicPageDescription}
                </p>
              )}
            </div>
          </div>
          
          {/* Горизонтальная граница после описания - более четкая */}
          <div className={`border-t-4 mb-8 ${isDarkLocal ? 'border-gray-500' : 'border-amber-300'}`}></div>
          
          {/* Нижняя часть с услугами */}
          <div className="rounded-2xl p-6">
            <EnhancedServiceSelection
            serviceGroups={[...(team?.serviceGroups || []), ...(team?.ungroupedServices?.length ? [{ id: 'ungrouped', name: 'Услуги', services: team.ungroupedServices, order: 999 } as any] : [])] as any}
            selectedServices={bookingData.services}
            onServiceSelect={handleServiceSelect}
            onNext={handleNext}
            className="animate-fade-in"
            showImagesOverride={showImagesByTeam}
          />
          </div>
        </div>
      </div>
    )
  }

  // Лейаут для остальных шагов остаётся прежним в Card
  return (
    <div className={isDarkLocal ? 'min-h-screen bg-neutral-900 text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8' : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8'}>
      <DebugInfo bookingData={bookingData} />
      <Card className={isDarkLocal ? 'w-full max-w-5xl bg-neutral-800/80 backdrop-blur-lg shadow-xl rounded-xl p-4 sm:p-6 lg:p-8 space-y-6 border-2 border-neutral-600 relative overflow-hidden' : 'w-full max-w-5xl bg-white/80 backdrop-blur-lg shadow-xl rounded-xl p-4 sm:p-6 lg:p-8 space-y-6 border-2 border-gray-300 relative overflow-hidden'}>
        {team?.team?.logoUrl && (
          <img
            src={team.team.logoUrl}
            alt={`${team.team.name} Logo`}
            className="h-16 w-auto mx-auto mb-4"
          />
        )}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">{team.team?.name}</h1>

        <div className="relative min-h-[400px]">
          {currentStep === 'select-date-time' && team && masters.length > 0 && (
            <EnhancedDateMasterTimeSelection
              masters={masters}
              selectedServices={bookingData.services}
              selectedDate={bookingData.date}
              selectedMaster={bookingData.master}
              selectedTimeSlot={bookingData.timeSlot}
              onDateTimeSelect={handleDateTimeSelect}
              bookingStep={team.team.bookingStep}
              salonTimezone={team.team.timezone || 'Europe/Moscow'}
              onNext={handleNext}
              className="animate-fade-in"
            />
          )}

          {currentStep === 'select-date-time' && (!team || masters.length === 0) && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b] mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка данных...</p>
            </div>
          )}

          {currentStep === 'client-info' && (
            <EnhancedClientInfoAndConfirmation
              bookingData={bookingData}
              onClientInfoChange={handleClientInfoChange}
              onBookingConfirmed={handleBookingConfirmed}
              className="animate-fade-in"
            />
          )}
        </div>
      </Card>
    </div>
  )
}