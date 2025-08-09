'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { EnhancedServiceSelection } from '@/components/EnhancedServiceSelection'
import { EnhancedDateMasterTimeSelection } from '@/components/EnhancedDateMasterTimeSelection'
import { EnhancedClientInfoForm } from '@/components/EnhancedClientInfoForm'
import { BookingConfirmation } from '@/components/BookingConfirmation'
import { Service, ServiceGroup, Master, TimeSlot, BookingData, BookingStep, ClientInfo } from '@/types/booking'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface Team {
  id: string
  name: string
  logoUrl?: string
  privacyPolicyUrl?: string
  slug: string
  bookingStep: number
  timezone: string
}

export default function BookingWidget() {
  const params = useParams()
  const slug = params.slug as string
  const telegramWebApp = useTelegramWebApp()

  const [currentStep, setCurrentStep] = useState<BookingStep>('select-services')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
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
    loadInitialData()
  }, [slug])

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
        // Валидация формы клиента будет внутри компонента EnhancedClientInfoForm
        // Здесь просто переходим, если форма считается валидной
        goToStep('confirmation')
        break
      case 'confirmation':
        // Это финальный шаг, здесь может быть отправка бронирования
        // Или просто переход на страницу успеха
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
      case 'confirmation':
        goToStep('client-info')
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

  const handleFormSubmit = () => {
    handleNext()
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
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-4xl bg-white/80 backdrop-blur-lg shadow-xl rounded-xl p-6 sm:p-8 space-y-6 border border-gray-200 relative overflow-hidden">
        {team.logoUrl && (
          <img
            src={team.logoUrl}
            alt={`${team.name} Logo`}
            className="h-16 w-auto mx-auto mb-4"
          />
        )}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">{team.name}</h1>

        <ProgressIndicator currentStep={currentStep} />

        <div className="relative min-h-[400px]"> {/* Минимальная высота для контента */}
          {currentStep === 'select-services' && (
            <EnhancedServiceSelection
              serviceGroups={serviceGroups}
              selectedServices={bookingData.services}
              onServiceSelect={handleServiceSelect}
              className="animate-fade-in"
            />
          )}
          {currentStep === 'select-date-time' && (
            <EnhancedDateMasterTimeSelection
              masters={masters}
              selectedServices={bookingData.services}
              selectedDate={bookingData.date}
              selectedMaster={bookingData.master}
              selectedTimeSlot={bookingData.timeSlot}
              onDateTimeSelect={handleDateTimeSelect}
              bookingStep={team.bookingStep}
              salonTimezone={team.timezone}
              className="animate-fade-in"
            />
          )}
          {currentStep === 'client-info' && (
            <EnhancedClientInfoForm
              clientInfo={bookingData.clientInfo}
              onClientInfoChange={handleClientInfoChange}
              onFormSubmit={handleFormSubmit}
              className="animate-fade-in"
            />
          )}
          {currentStep === 'confirmation' && (
            <BookingConfirmation
              bookingData={bookingData}
              onConfirmBooking={handleBookingConfirmed}
              className="animate-fade-in"
            />
            )}
          </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          {currentStep !== 'select-services' && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад</span>
            </Button>
          )}

          {currentStep !== 'confirmation' && currentStep !== 'client-info' && (
            <Button
              onClick={handleNext}
              className={`ml-auto flex items-center space-x-2 bg-[#00acf4] hover:bg-[#0099e0] text-white ${
                (currentStep === 'select-services' && bookingData.services.length === 0) ||
                (currentStep === 'select-date-time' && (!bookingData.date || !bookingData.master || !bookingData.timeSlot))
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
                    disabled={
                (currentStep === 'select-services' && bookingData.services.length === 0) ||
                (currentStep === 'select-date-time' && (!bookingData.date || !bookingData.master || !bookingData.timeSlot))
              }
            >
              <span>Далее</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}