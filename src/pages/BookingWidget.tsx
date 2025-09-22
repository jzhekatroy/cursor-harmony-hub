import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { EnhancedServiceSelection } from '../components/EnhancedServiceSelection';
import { EnhancedDateMasterTimeSelection } from '../components/EnhancedDateMasterTimeSelection';
import { EnhancedClientInfoAndConfirmation } from '../components/EnhancedClientInfoAndConfirmation';
import ActiveBookingsNotification from '../components/ActiveBookingsNotification';
import { StepProgress } from '../components/StepProgress';
import { TeamBranding } from '../components/TeamBranding';
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
    name: '2Minutes',
    logoUrl: '/src/assets/logo.png',
    slug: '2minutes',
    bookingStep: 3,
    timezone: 'Europe/Moscow',
    publicServiceCardsWithPhotos: true,
    publicTheme: 'light',
    publicPageTitle: 'Запись в 2Minutes',
    publicPageDescription: 'Быстрые и качественные услуги красоты за 2 минуты',
    publicPageLogoUrl: '/src/assets/logo.png',
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
    <div className="min-h-screen bg-background">
      {/* Mobile-First Layout */}
      <div className="md:hidden">
        {/* Team Branding - показываем только на первом шаге */}
        {currentStep === 1 && (
          <div className="px-4 pt-6 pb-2">
            <TeamBranding team={team.team} showDescription={true} />
          </div>
        )}
        
        {/* Mobile Header */}
        <div className={currentStep === 1 ? "relative bg-background/95 backdrop-blur-sm border-b px-4 py-3" : "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b px-4 py-3"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousStep}
                  className="w-10 h-10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-semibold">
                  {currentStep === 1 && 'Выберите услуги'}
                  {currentStep === 2 && 'Дата и время'}
                  {currentStep === 3 && 'Подтверждение'}
                </h1>
                <p className="text-xs text-muted-foreground">Шаг {currentStep} из 3</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Progress Bar */}
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Mobile Content - Full Screen */}
        <div className="pt-20 pb-24 px-4">
          <div className="min-h-[calc(100vh-11rem)]">
            {loading ? (
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Загрузка...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="text-destructive text-6xl mb-4">⚠️</div>
                  <p className="text-destructive">{error}</p>
                </div>
              </div>
            ) : !team ? (
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="text-muted-foreground text-6xl mb-4">❌</div>
                  <p>Команда не найдена</p>
                </div>
              </div>
            ) : (
              <div className="w-full">
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
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        {!loading && !error && team && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t px-4 py-4">
            {currentStep > 1 && currentStep < 3 && (
              <Button
                onClick={goToNextStep}
                disabled={!canGoToNextStep()}
                size="lg"
                className="w-full h-14 text-lg font-medium"
              >
                Далее
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            
            {/* Service Summary on Mobile */}
            {bookingData.services.length > 0 && currentStep > 1 && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>{bookingData.services.length} услуг • {bookingData.totalDuration} мин</span>
                  <span className="font-semibold">{new Intl.NumberFormat('ru-RU').format(bookingData.totalPrice)} ₽</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex min-h-screen">
          {/* Main Content */}
          <main className="flex-1 p-6 lg:p-8">
            {/* Desktop Header with Team Branding */}
            <div className="text-center py-8 max-w-2xl mx-auto">
              <TeamBranding team={team.team} showDescription={true} />
            </div>

            {/* Desktop Step Progress */}
            <div className="max-w-2xl mx-auto mb-8">
              <StepProgress 
                currentStep={currentStep}
                totalSteps={3}
                stepLabels={['Услуги', 'Дата и время', 'Подтверждение']}
              />
            </div>

            {/* Desktop Step Content */}
            <div className="max-w-4xl mx-auto">
              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Загрузка...</p>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card>
                  <CardContent className="p-8 text-center text-destructive">
                    <p>Ошибка: {error}</p>
                  </CardContent>
                </Card>
              ) : !team ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p>Команда не найдена</p>
                  </CardContent>
                </Card>
              ) : (
                <div>
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

            {/* Desktop Navigation */}
            {!loading && !error && team && (
              <div className="max-w-4xl mx-auto flex justify-between items-center mt-8 p-4 bg-muted/30 rounded-lg">
                <Button
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2"
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
                  className="flex items-center gap-2"
                >
                  {currentStep === 3 ? 'Завершить' : 'Далее'}
                  {currentStep !== 3 && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </main>

          {/* Desktop Sidebar */}
          <aside className="w-80 lg:w-96 p-6 border-l bg-muted/20">
            <div className="sticky top-6">
              <h3 className="font-semibold text-lg mb-4">Ваша запись</h3>
              
              {bookingData.services.length > 0 ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {bookingData.services.map((service) => (
                        <div key={service.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{service.name}</span>
                          <span className="font-medium">{new Intl.NumberFormat('ru-RU').format(service.price)} ₽</span>
                        </div>
                      ))}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between font-semibold">
                          <span>Итого:</span>
                          <span className="text-primary">{new Intl.NumberFormat('ru-RU').format(bookingData.totalPrice)} ₽</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Время: {bookingData.totalDuration} мин
                        </div>
                      </div>
                      
                      {bookingData.date && (
                        <div className="border-t pt-3 mt-3 text-sm">
                          <div className="text-muted-foreground">Дата: {bookingData.date}</div>
                          {bookingData.timeSlot && (
                            <div className="text-muted-foreground">Время: {bookingData.timeSlot.time}</div>
                          )}
                          {bookingData.master && (
                            <div className="text-muted-foreground">
                              Мастер: {bookingData.master.firstName} {bookingData.master.lastName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-muted-foreground text-sm">
                  Выберите услуги для начала бронирования
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}