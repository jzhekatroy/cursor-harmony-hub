'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
// ProgressIndicator убран по требованию дизайна
import { EnhancedServiceSelection } from '@/components/EnhancedServiceSelection'
import { EnhancedDateMasterTimeSelection } from '@/components/EnhancedDateMasterTimeSelection'
import { EnhancedClientInfoAndConfirmation } from '@/components/EnhancedClientInfoAndConfirmation'
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
  }
  serviceGroups: any[]
  ungroupedServices: any[]
  masters: any[]
}

export default function BookingWidget() {
  const params = useParams()
  const slug = params.slug as string
  const telegramWebApp = useTelegramWebApp()

  const [currentStep, setCurrentStep] = useState<BookingStep>('select-services')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamData | null>(null)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [masters, setMasters] = useState<Master[]>([])

  const [bookingData, setBookingData] = useState<BookingData>({
    services: [],
    date: '',
    master: null,
    timeSlot: null,
    clientInfo: { name: '', phone: '', email: '', notes: '' },
    totalPrice: 0,
    totalDuration: 0,
  })

  // Загрузка данных
  useEffect(() => {
    console.log('🔍 useEffect: slug changed, calling loadInitialData');
    loadInitialData()
  }, [slug])

  // Отслеживаем изменения team
  useEffect(() => {
    console.log('🔍 useEffect: team changed, team =', team);
    if (team) {
      console.log('🔍 useEffect: team.team?.timezone =', team.team?.timezone)
      console.log('🔍 useEffect: team.team.timezone type =', typeof team.team?.timezone)
      console.log('🔍 useEffect: team.team =', team.team)
      console.log('🔍 useEffect: masters.length =', masters.length)
    }
  }, [team, masters])

  // Отслеживаем изменения bookingData.timeSlot
  useEffect(() => {
    console.log('🔍 useEffect: bookingData.timeSlot =', bookingData.timeSlot?.time)
  }, [bookingData.timeSlot])

  const loadInitialData = async () => {
    console.log('🔍 loadInitialData: starting...');
    try {
      setLoading(true)

      // Загружаем данные команды
      const teamResponse = await fetch(`/api/teams/${slug}`)
      if (!teamResponse.ok) {
        throw new Error('Команда не найдена')
      }
      const teamData = await teamResponse.json()
      console.log('🔍 DEBUG: teamData.team.timezone =', teamData.team?.timezone)
      console.log('🔍 DEBUG: teamData =', teamData)
      console.log('🔍 DEBUG: teamData.team =', teamData.team)
      
      // Проверяем структуру данных перед установкой
      if (teamData && teamData.team && teamData.team.timezone) {
        console.log('🔍 DEBUG: Setting team data with timezone:', teamData.team.timezone)
        setTeam(teamData)
      } else {
        console.error('🔍 ERROR: Invalid teamData structure:', teamData)
        console.error('🔍 ERROR: teamData.team =', teamData?.team)
        console.error('🔍 ERROR: teamData.team.timezone =', teamData?.team?.timezone)
        // Устанавливаем данные даже если timezone отсутствует, чтобы страница не зависла
        setTeam(teamData)
      }

      // Загружаем группы услуг (публичный API)
      const servicesResponse = await fetch(`/api/teams/${slug}/services`)
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        console.log('🔍 loadInitialData: services loaded:', servicesData.length, 'groups');
        setServiceGroups(servicesData)
      }

      // Загружаем мастеров (публичный API)
      const mastersResponse = await fetch(`/api/teams/${slug}/masters`)
      if (mastersResponse.ok) {
        const mastersData = await mastersResponse.json()
        console.log('🔍 loadInitialData: masters loaded:', mastersData.length, 'masters');
        setMasters(mastersData)
      }
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      setError(error instanceof Error ? error.message : 'Ошибка загрузки данных')
    } finally {
      console.log('🔍 loadInitialData: finally block, setting loading to false');
      setLoading(false)
    }
  }

  // Навигация по шагам
  const goToStep = (step: BookingStep) => {
    setCurrentStep(step)
  }

  const handleNext = () => {
    console.log('🔍 handleNext called with currentStep:', currentStep);
    console.log('🔍 handleNext: bookingData.services.length =', bookingData.services.length);
    
    switch (currentStep) {
      case 'select-services':
        if (bookingData.services.length > 0) {
          console.log('🔍 handleNext: going to select-date-time');
          goToStep('select-date-time')
        } else {
          console.log('🔍 handleNext: no services selected, showing alert');
          alert('Пожалуйста, выберите хотя бы одну услугу.')
        }
        break
      case 'select-date-time':
        if (bookingData.date && bookingData.master && bookingData.timeSlot) {
          console.log('🔍 handleNext: going to client-info');
          goToStep('client-info')
        } else {
          console.log('🔍 handleNext: incomplete date-time selection, showing alert');
          alert('Пожалуйста, выберите дату, мастера и время.')
        }
        break
      case 'client-info':
        // Финальный шаг - обработка в компоненте EnhancedClientInfoAndConfirmation
        console.log('🔍 handleNext: already at client-info step');
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
    console.log('🔍 handleServiceSelect called with services:', services.map(s => s.name));
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0)
    setBookingData(prev => ({ ...prev, services, totalDuration, totalPrice }))
  }

  const handleDateTimeSelect = (date: string, master: Master | null, timeSlot: TimeSlot | null) => {
    console.log('🔍 handleDateTimeSelect:', { date, master: timeSlot?.time })
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
      clientInfo: { name: '', phone: '', email: '', notes: '' },
      totalPrice: 0,
      totalDuration: 0,
    })
    setCurrentStep('select-services') // Вернуться к началу
  }

  if (loading) {
    console.log('🔍 RENDER: showing loading state');
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



  console.log('🔍 RENDER: main render, currentStep =', currentStep);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-4xl bg-white/80 backdrop-blur-lg shadow-xl rounded-xl p-6 sm:p-8 space-y-6 border border-gray-200 relative overflow-hidden">
        {team?.team?.logoUrl && (
          <img
            src={team.team.logoUrl}
            alt={`${team.team.name} Logo`}
            className="h-16 w-auto mx-auto mb-4"
          />
        )}
                          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">{team.team?.name}</h1>
 
                           {/* Debug панель скрыта в продакшене */}
 
        {/* Контент шагов */}
        <div className="relative min-h-[400px]">
          {currentStep === 'select-services' && (
            <EnhancedServiceSelection
              serviceGroups={[...(team?.serviceGroups || []), ...(team?.ungroupedServices?.length ? [{ id: 'ungrouped', name: 'Услуги', services: team.ungroupedServices, order: 999 } as any] : [])] as any}
              selectedServices={bookingData.services}
              onServiceSelect={handleServiceSelect}
              onNext={handleNext}
              className="animate-fade-in"
            />
          )}

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

        {/* Нижняя панель навигации удалена, чтобы не дублировать кнопку Continue на шаге услуг */}
      </Card>
    </div>
  )
}