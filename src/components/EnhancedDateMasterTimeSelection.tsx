import React, { useState, useMemo } from 'react'
import { Master, Service, TimeSlot } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClientTimezone } from '@/hooks/useClientTimezone'

interface EnhancedDateMasterTimeSelectionProps {
  masters: Master[];
  selectedServices: Service[];
  selectedDate: string;
  selectedMaster: Master | null;
  selectedTimeSlot: TimeSlot | null;
  onDateTimeSelect: (date: string, master: Master | null, timeSlot: TimeSlot | null) => void;
  bookingStep: number;
  salonTimezone: string;
  className?: string;
  onNext?: () => void;
}

export function EnhancedDateMasterTimeSelection({
  masters,
  selectedServices,
  selectedDate,
  selectedMaster,
  selectedTimeSlot,
  onDateTimeSelect,
  bookingStep,
  salonTimezone,
  className,
  onNext
}: EnhancedDateMasterTimeSelectionProps) {
  
  const { clientTimezone, loading: timezoneLoading } = useClientTimezone()

  // Подсумма по выбранным услугам для шапки
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s?.duration || 0), 0),
    [selectedServices]
  )
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s?.price || 0), 0),
    [selectedServices]
  )

  // Генерируем доступные даты (следующие 30 дней)
  const availableDates = useMemo(() => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }, [])

  // Генерируем временные слоты
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots = []
    
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push({
          time,
          available: Math.random() > 0.3 // Случайная доступность для демо
        })
      }
    }
    
    return slots
  }, [selectedDate, selectedMaster])

  const handleDateSelect = (date: string) => {
    onDateTimeSelect(date, selectedMaster, null)
  }

  const handleMasterSelect = (master: Master) => {
    onDateTimeSelect(selectedDate, master, selectedTimeSlot)
  }

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    onDateTimeSelect(selectedDate, selectedMaster, timeSlot)
  }

  const handleNext = () => {
    if (selectedDate && selectedTimeSlot && onNext) {
      onNext()
    }
  }

  // Убираем загрузку timezone - она не нужна для этого компонента
  // if (timezoneLoading) {
  //   return loading state
  // }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header Card */}
      <Card className="modern-card rounded-2xl border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg bg-gradient-primary bg-clip-text text-transparent">
              <Calendar className="w-5 h-5 text-primary" />
              Выбор даты и времени
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Услуг: {selectedServices.length}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {totalDuration} мин
              </span>
              <span className="font-medium text-primary">{new Intl.NumberFormat('ru-RU').format(totalPrice)} ₽</span>
            </div>
          </div>
        </CardHeader>
      </Card>
        
      {/* Выбор мастера (если есть несколько) */}
      {masters.length > 1 && (
        <Card className="modern-card rounded-2xl border-0 animate-fade-in">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Выберите мастера
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {masters.map((master, index) => (
                <Card
                  key={master.id}
                  className={cn(
                    "morph-card cursor-pointer transition-all duration-300 rounded-xl border-0 touch-target animate-slide-up",
                    selectedMaster?.id === master.id 
                      ? "ring-2 ring-primary bg-primary-soft shadow-lg shadow-primary/10" 
                      : "hover:shadow-md hover:scale-[1.02] bg-gradient-card"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleMasterSelect(master)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {master.photoUrl && (
                        <img 
                          src={master.photoUrl} 
                          alt={`${master.firstName} ${master.lastName}`}
                          className="w-12 h-12 rounded-full object-cover shadow-sm"
                        />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{master.firstName} {master.lastName}</p>
                        {master.specialization && (
                          <p className="text-sm text-muted-foreground">{master.specialization}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Выбор даты */}
      <Card className="modern-card rounded-2xl border-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Выберите дату
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
            {availableDates.slice(0, 14).map((date, index) => {
              const dateObj = new Date(date)
              const isSelected = selectedDate === date
              const isToday = date === new Date().toISOString().split('T')[0]
              
              return (
                <Button
                  key={date}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateSelect(date)}
                  className={cn(
                    "h-auto p-3 flex flex-col gap-1 rounded-xl transition-all duration-300 animate-scale-in touch-target",
                    isSelected && "bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/25",
                    isToday && !isSelected && "border-primary",
                    "hover:scale-105"
                  )}
                  style={{ animationDelay: `${300 + index * 50}ms` }}
                >
                  <span className="text-xs opacity-80">
                    {dateObj.toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </span>
                  <span className="font-bold text-base">
                    {dateObj.getDate()}
                  </span>
                  <span className="text-xs opacity-80">
                    {dateObj.toLocaleDateString('ru-RU', { month: 'short' })}
                  </span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Выбор времени */}
      {selectedDate && (
        <Card className="modern-card rounded-2xl border-0 animate-slide-up">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Выберите время
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {timeSlots.filter(slot => slot.available).slice(0, 18).map((slot, index) => (
                <Button
                  key={slot.time}
                  variant={selectedTimeSlot?.time === slot.time ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTimeSlotSelect(slot)}
                  className={cn(
                    "text-sm rounded-xl transition-all duration-300 animate-scale-in touch-target",
                    selectedTimeSlot?.time === slot.time && "bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/25",
                    "hover:scale-105"
                  )}
                  style={{ animationDelay: `${100 + index * 30}ms` }}
                >
                  {slot.time}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Summary для выбранного времени */}
      {selectedDate && selectedTimeSlot && (
        <Card className="md:hidden bg-gradient-primary text-primary-foreground rounded-2xl border-0 shadow-xl shadow-primary/20 animate-scale-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-sm">✓ Время выбрано</h3>
                <p className="text-xs opacity-90">
                  {new Date(selectedDate).toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })} в {selectedTimeSlot.time}
                </p>
              </div>
              <Button
                onClick={handleNext}
                className="bg-white/20 text-primary-foreground hover:bg-white/30 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm border border-white/20 touch-target"
              >
                Далее
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}