import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { EnhancedServiceSelection } from '../components/EnhancedServiceSelection';
import { EnhancedDateMasterTimeSelection } from '../components/EnhancedDateMasterTimeSelection';
import { EnhancedClientInfoAndConfirmation } from '../components/EnhancedClientInfoAndConfirmation';
import ActiveBookingsNotificationMobile from '../components/ActiveBookingsNotificationMobile';
import { TeamBranding } from '../components/TeamBranding';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, ArrowRight, MoreVertical } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import type { 
  BookingData, 
  BookingStep, 
  Service, 
  Master, 
  TimeSlot, 
  ClientInfo, 
  TeamData 
} from '../types/booking';

// Демо данные для примера
const demoTeamData: TeamData = {
  team: {
    id: '1',
    name: '2Minutes',
    logoUrl: '/src/assets/logo.png',
    slug: '2minutes',
    bookingStep: 3,
    timezone: 'Europe/Moscow',
    publicServiceCardsWithPhotos: true,
    publicTheme: 'light',
    publicPageTitle: 'Салон каких-то красивых ногтей',
    publicPageDescription: 'Быстрые и качественные услуги красоты за 2 минуты',
    publicPageLogoUrl: '/src/assets/logo.png',
    publicPageAddress: 'ул. Примерная, 15, Москва',
  },
  serviceGroups: [
    {
      id: '1',
      name: 'Маникюр и педикюр',
      order: 1,
      services: [
        {
          id: '1',
          name: 'Маникюр классический',
          duration: 60,
          price: 2000,
          description: 'Профессиональный уход за ногтями рук',
          image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400'
        },
        {
          id: '2',
          name: 'Педикюр spa',
          duration: 90,
          price: 3500,
          description: 'Расслабляющий уход за ногтями ног',
          image: 'https://images.unsplash.com/photo-1561579890-5c4cdbc7c2d9?w=400'
        }
      ]
    },
    {
      id: '2',
      name: 'Стрижки и укладки',
      order: 2,
      services: [
        {
          id: '3',
          name: 'Женская стрижка',
          duration: 45,
          price: 2500,
          description: 'Модная стрижка с учетом типа лица'
        },
        {
          id: '4',
          name: 'Укладка волос',
          duration: 30,
          price: 1500,
          description: 'Профессиональная укладка'
        }
      ]
    }
  ],
  ungroupedServices: [],
  masters: [
    {
      id: '1',
      firstName: 'Анна',
      lastName: 'Иванова',
      specialization: 'Мастер маникюра',
      photoUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=200'
    },
    {
      id: '2',
      firstName: 'Мария',
      lastName: 'Петрова',
      specialization: 'Парикмахер-стилист',
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200'
    }
  ]
}

export default function BookingWidget() {
  const telegramWebApp = useTelegramWebApp()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamData | null>(demoTeamData)

  const [bookingData, setBookingData] = useState<BookingData>({
    services: [],
    date: '',
    master: null,
    timeSlot: null,
    clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
    totalPrice: 0,
    totalDuration: 0,
  })

  // Состояния для активных записей
  const [activeBookings, setActiveBookings] = useState([
    {
      id: '1',
      serviceName: 'Маникюр классический',
      date: '2024-09-25',
      time: '14:00',
      masterName: 'Анна Иванова',
      status: 'confirmed' as const
    },
    {
      id: '2', 
      serviceName: 'Женская стрижка',
      date: '2024-09-26',
      time: '16:30',
      masterName: 'Мария Петрова',
      status: 'pending' as const
    }
  ])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  // Умное заполнение полей из Telegram
  useEffect(() => {
    if (telegramWebApp.isAvailable && telegramWebApp.user) {
      setBookingData(prev => ({
        ...prev,
        clientInfo: {
          ...prev.clientInfo,
          firstName: telegramWebApp.user?.first_name || '',
          lastName: telegramWebApp.user?.last_name || ''
        }
      }))
    }
  }, [telegramWebApp.isAvailable, telegramWebApp.user])

  const handleServiceSelect = (services: Service[]) => {
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price || 0), 0)
    const totalDuration = services.reduce((sum, service) => sum + (service.duration || 0), 0)
    
    setBookingData(prev => ({
      ...prev,
      services,
      totalPrice,
      totalDuration
    }))
  }

  const handleDateTimeSelect = (date: string, master: Master | null, timeSlot: TimeSlot | null) => {
    console.log('handleDateTimeSelect called:', { date, master: master?.firstName, timeSlot: timeSlot?.time })
    setBookingData(prev => ({
      ...prev,
      date,
      master,
      timeSlot
    }))
  }

  const handleClientInfoChange = (clientInfo: ClientInfo) => {
    setBookingData(prev => ({
      ...prev,
      clientInfo
    }))
  }

  const handleBookingConfirmed = async () => {
    try {
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Запись создана!",
        description: "Ваша запись успешно подтверждена",
      })
      
      // Сбрасываем форму
      setBookingData({
        services: [],
        date: '',
        master: null,
        timeSlot: null,
        clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
        totalPrice: 0,
        totalDuration: 0,
      })
      setCurrentStep(1)
      
    } catch (error) {
      console.error('Error confirming booking:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать запись. Попробуйте еще раз.",
        variant: "destructive"
      })
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      setIsLoadingBookings(true)
      // Имитация API запроса
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setActiveBookings(prev => prev.filter(booking => booking.id !== bookingId))
      
      toast({
        title: "Запись отменена",
        description: "Ваша запись успешно отменена",
      })
    } catch (error) {
      console.error('Error canceling booking:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось отменить запись. Попробуйте еще раз.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingBookings(false)
    }
  }

  const goToNextStep = () => {
    console.log('goToNextStep called, currentStep:', currentStep)
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    console.log('goToPreviousStep called, currentStep:', currentStep)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canGoToNextStep = () => {
    switch(currentStep) {
      case 1:
        return bookingData.services.length > 0
      case 2:
        return bookingData.date && bookingData.timeSlot
      case 3:
        return true
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold mb-2">Ошибка</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Попробовать снова
          </Button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-muted-foreground text-4xl mb-4">❌</div>
          <h1 className="text-xl font-semibold mb-2">Команда не найдена</h1>
          <p className="text-muted-foreground">Проверьте правильность ссылки</p>
        </div>
      </div>
    )
  }

  const stepTitles = ['Услуги', 'Дата и время', 'Подтверждение']

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className={`${currentStep === 1 ? 'relative' : 'fixed top-0 left-0 right-0 z-50'} 
        bg-background border-b border-border`}>
        
        {/* Main Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1">
            {currentStep > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousStep}
                className="w-8 h-8 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            
            <div className="flex-1">
              <h1 className="text-lg font-medium truncate">
                {stepTitles[currentStep - 1]}
              </h1>
              <p className="text-xs text-muted-foreground">
                Шаг {currentStep} из {stepTitles.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${(currentStep / stepTitles.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Team Branding на первом шаге */}
        {currentStep === 1 && (
          <div className="px-4 pb-4">
            <TeamBranding team={team.team} showDescription={false} />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`${currentStep === 1 ? 'pt-0' : 'pt-32'} pb-24 p-4`}>
        {/* Active Bookings - только на первом шаге */}
        {currentStep === 1 && activeBookings.length > 0 && (
          <div className="mb-6">
            <ActiveBookingsNotificationMobile
              activeBookings={activeBookings}
              isLoading={isLoadingBookings}
              onCancelBooking={handleCancelBooking}
            />
          </div>
        )}

        {/* Step Content */}
        <div className="max-w-md mx-auto">
          {currentStep === 1 && (
            <EnhancedServiceSelection
              serviceGroups={team.serviceGroups}
              ungroupedServices={team.ungroupedServices}
              selectedServices={bookingData.services}
              onServiceSelect={handleServiceSelect}
              onNext={goToNextStep}
            />
          )}

          {currentStep === 2 && (
            <EnhancedDateMasterTimeSelection
              masters={team.masters}
              selectedServices={bookingData.services}
              selectedDate={bookingData.date}
              selectedMaster={bookingData.master}
              selectedTimeSlot={bookingData.timeSlot}
              onDateTimeSelect={handleDateTimeSelect}
              onNext={goToNextStep}
              bookingStep={team.team.bookingStep}
              salonTimezone={team.team.timezone}
            />
          )}

          {currentStep === 3 && (
            <EnhancedClientInfoAndConfirmation
              bookingData={bookingData}
              onClientInfoChange={handleClientInfoChange}
              onBookingConfirmed={handleBookingConfirmed}
              onServiceRemove={(serviceId) => {
                const updatedServices = bookingData.services.filter(s => s.id !== serviceId)
                handleServiceSelect(updatedServices)
              }}
              onStartOver={() => {
                setCurrentStep(1)
                setBookingData({
                  services: [],
                  date: '',
                  master: null,
                  timeSlot: null,
                  clientInfo: { name: '', firstName: '', lastName: '', phone: '', email: '', notes: '' },
                  totalPrice: 0,
                  totalDuration: 0,
                })
              }}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      {currentStep === 2 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                className="h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <Button
                onClick={goToNextStep}
                disabled={!canGoToNextStep()}
                className="h-12"
              >
                Далее
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Service Summary */}
            {bookingData.services.length > 0 && (
              <div className="mt-3 p-3 bg-muted/30 rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {bookingData.services.length} услуг • {bookingData.totalDuration} мин
                  </span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('ru-RU').format(bookingData.totalPrice)} ₽
                  </span>
                </div>
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}