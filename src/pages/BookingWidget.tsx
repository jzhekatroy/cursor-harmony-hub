import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { EnhancedServiceSelection } from '../components/EnhancedServiceSelection';
import { EnhancedDateMasterTimeSelection } from '../components/EnhancedDateMasterTimeSelection';
import { EnhancedClientInfoAndConfirmation } from '../components/EnhancedClientInfoAndConfirmation';
import ActiveBookingsNotification from '../components/ActiveBookingsNotification';
import { StepProgress } from '../components/StepProgress';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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
    name: 'Beauty Studio',
    slug: 'beauty-studio',
    bookingStep: 3,
    timezone: 'Europe/Moscow',
    publicServiceCardsWithPhotos: true,
    publicTheme: 'light',
    publicPageTitle: 'Запись в Beauty Studio',
    publicPageDescription: 'Профессиональные услуги красоты',
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
          description: 'Модная стрижка с учетом типа лица',
          image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400'
        },
        {
          id: '4',
          name: 'Укладка волос',
          duration: 30,
          price: 1500,
          description: 'Профессиональная укладка',
          image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400'
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
  const [activeBookings, setActiveBookings] = useState<any[]>([])
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Ошибка</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Команда не найдена</h1>
          <p className="text-muted-foreground">Проверьте правильность ссылки</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='currentColor' fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }} />
      </div>

      <div className="flex min-h-screen relative z-10">
        {/* Main Content */}
        <main className="flex-1 p-4 space-y-6">
          {/* Header with Flowing Text */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold mb-2 text-flow">
              Забронировать услугу
            </h1>
            <p className="text-muted-foreground text-lg">
              Простое и удобное онлайн бронирование
            </p>
          </div>

          {/* Step Progress */}
          <StepProgress 
            currentStep={currentStep}
            totalSteps={3}
            stepLabels={['Услуги', 'Дата и время', 'Подтверждение']}
          />

          {/* Step Content */}
          <div className="max-w-4xl mx-auto">
            <div className="animate-morph-in">
              {loading ? (
                <Card className="premium-card">
                  <CardContent className="p-8 text-center">
                    <div className="animate-pulse-soft">Загрузка...</div>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card className="premium-card">
                  <CardContent className="p-8 text-center text-destructive">
                    <p>Ошибка: {error}</p>
                  </CardContent>
                </Card>
              ) : !team ? (
                <Card className="premium-card">
                  <CardContent className="p-8 text-center">
                    <p>Команда не найдена</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="animate-step-transition">
                  {currentStep === 1 && (
                    <EnhancedServiceSelection
                      serviceGroups={team.serviceGroups}
                      ungroupedServices={team.ungroupedServices}
                      selectedServices={bookingData.services}
                      onServiceSelect={handleServiceSelect}
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
                      bookingStep={team.team.bookingStep}
                      salonTimezone={team.team.timezone}
                    />
                  )}

                  {currentStep === 3 && (
                    <EnhancedClientInfoAndConfirmation
                      bookingData={bookingData}
                      onClientInfoChange={handleClientInfoChange}
                      onBookingConfirmed={handleBookingConfirmed}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          {!loading && !error && team && (
            <div className="max-w-4xl mx-auto flex justify-between items-center p-4 glass rounded-2xl shadow-xl sticky bottom-4 border border-white/20">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 hover:scale-105 transition-transform duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </Button>

              <div className="text-sm font-medium text-muted-foreground">
                Шаг {currentStep} из 3
              </div>

              <Button
                onClick={goToNextStep}
                disabled={!canGoToNextStep()}
                className="btn-elegant flex items-center gap-2"
              >
                {currentStep === 3 ? 'Завершить' : 'Далее'}
                {currentStep !== 3 && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </main>

        {/* Sidebar for Booking Summary */}
        <aside className="hidden lg:block lg:w-80 p-4">
          {bookingData.services.length > 0 && (
            <Card className="premium-card sticky top-4">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  📋 Ваша запись
                </h3>
                <div className="space-y-3">
                  {bookingData.services.map((service) => (
                    <div key={service.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{service.name}</span>
                      <span className="font-medium">{new Intl.NumberFormat('ru-RU').format(service.price)} ₽</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Итого:</span>
                      <span className="text-primary">{new Intl.NumberFormat('ru-RU').format(bookingData.totalPrice)} ₽</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Время: {bookingData.totalDuration} мин
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}