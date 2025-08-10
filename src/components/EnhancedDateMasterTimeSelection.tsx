'use client'

import React, { useState, useEffect } from 'react'
import { Master, Service, TimeSlot } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClientTimezone } from '@/hooks/useClientTimezone'
import { TimezoneDisplay } from '@/components/TimezoneDisplay'
import { getTimezoneDifference } from '@/lib/timezone'

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
  className
}: EnhancedDateMasterTimeSelectionProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const { clientTimezone, loading: timezoneLoading } = useClientTimezone()

  // Отладочная информация для salonTimezone
  console.log('🔍 EnhancedDateMasterTimeSelection: salonTimezone =', salonTimezone)
  console.log('🔍 EnhancedDateMasterTimeSelection: selectedTimeSlot =', selectedTimeSlot?.time)

  // Проверяем что все необходимые пропсы доступны
  if (!salonTimezone) {
    console.log('🔍 EnhancedDateMasterTimeSelection: salonTimezone is missing, rendering loading state')
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Выбор даты и времени
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00acf4] mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка временной зоны...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Отслеживаем изменения salonTimezone
  useEffect(() => {
    console.log('🔍 useEffect: salonTimezone changed to:', salonTimezone)
  }, [salonTimezone])

  // Отслеживаем монтирование/размонтирование компонента
  useEffect(() => {
    console.log('🔍 EnhancedDateMasterTimeSelection: Component mounted')
    return () => {
      console.log('🔍 EnhancedDateMasterTimeSelection: Component unmounted')
    }
  }, [])

  // Генерируем даты на следующие 14 дней
  const generateDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('ru-RU', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        })
      })
    }
    return dates
  }

  const dates = generateDates()

  // Фильтруем мастеров по выбранным услугам
  const availableMasters = masters.filter(master => {
    if (selectedServices.length === 0) return true
    
    // Проверяем что мастер может выполнить все выбранные услуги
    return selectedServices.every(service => 
      master.services && master.services.includes(service.id)
    )
  })

  // Автоматически выбираем сегодняшний день и первого мастера
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    
    // Автоматически выбираем сегодняшний день, если дата не выбрана
    if (!selectedDate) {
      onDateTimeSelect(today, selectedMaster, selectedTimeSlot)
    }
    
    // Автоматически выбираем первого доступного мастера, если мастер не выбран и есть услуги
    if (!selectedMaster && availableMasters.length > 0 && selectedServices.length > 0) {
      onDateTimeSelect(selectedDate || today, availableMasters[0], null)
    }
  }, [selectedServices, availableMasters, selectedDate, selectedMaster, onDateTimeSelect])

  // Загружаем доступные слоты при изменении даты или мастера
  useEffect(() => {
    if (selectedDate && selectedMaster && selectedServices.length > 0 && salonTimezone && clientTimezone) {
      loadAvailableSlots()
    }
  }, [selectedDate, selectedMaster, selectedServices, clientTimezone, salonTimezone])

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedMaster || !clientTimezone || !salonTimezone) return

    console.log('🔍 loadAvailableSlots: loading slots for', selectedDate, selectedMaster.id)

    setLoading(true)
    try {
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)
      const url = `/api/masters/${selectedMaster.id}/available-slots?date=${selectedDate}&duration=${totalDuration}&clientTimezone=${clientTimezone}`
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        
        // Преобразуем ответ API в нужный формат
        if (data.availableSlots && Array.isArray(data.availableSlots)) {
          const formattedSlots: TimeSlot[] = data.availableSlots.map((slot: any) => ({
            time: slot.time, // используем поле time из API
            available: true,
            timezoneInfo: slot.timezoneInfo // сохраняем информацию о временной зоне
          }))
          console.log('🔍 loadAvailableSlots: loaded', formattedSlots.length, 'slots')
          setAvailableSlots(formattedSlots)
        } else {
          console.log('🔍 loadAvailableSlots: no availableSlots in response')
          setAvailableSlots([])
        }
      } else {
        console.error('API error:', response.status, response.statusText)
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Ошибка загрузки слотов:', error)
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: string) => {
    onDateTimeSelect(date, selectedMaster, null)
  }

  const handleMasterSelect = (master: Master) => {
    onDateTimeSelect(selectedDate, master, null)
  }

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    console.log('🔍 handleTimeSlotSelect: selecting', timeSlot.time)
    onDateTimeSelect(selectedDate, selectedMaster, timeSlot)
  }

  // Показываем информацию о временных зонах
  const renderTimezoneInfo = () => {
    if (timezoneLoading || !clientTimezone) return null
    
    return (
      <div className="mb-4">
        <TimezoneDisplay
          salonTimezone={salonTimezone}
          clientTimezone={clientTimezone}
          difference={getTimezoneDifference(salonTimezone, clientTimezone)}
          className="mb-4"
        />
        {/* Отладочная информация */}
        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
          <div>DEBUG: salonTimezone = {salonTimezone}</div>
          <div>DEBUG: clientTimezone = {clientTimezone}</div>
          <div>DEBUG: selectedTimeSlot = {selectedTimeSlot ? `${selectedTimeSlot.time}` : 'null'}</div>
          <div>DEBUG: availableSlots count = {availableSlots.length}</div>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Выбор даты и времени
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Информация о временных зонах */}
        {renderTimezoneInfo()}

        {/* Выбор даты */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Выберите дату
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {dates.map((date, index) => {
                const isToday = date.value === new Date().toISOString().split('T')[0]
                const isSelected = selectedDate === date.value || (!selectedDate && isToday)
                
                return (
                  <Button
                    key={date.value}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleDateSelect(date.value)}
                    className={cn(
                      "text-sm flex flex-col",
                      isSelected && 'bg-[#00acf4] hover:bg-[#0099e0]',
                      isToday && !selectedDate && 'ring-2 ring-[#00acf4] ring-opacity-30'
                    )}
                  >
                    <span>{date.label}</span>
                    {isToday && <span className="text-xs opacity-80">Сегодня</span>}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Выбор мастера */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Выберите мастера
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableMasters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableMasters.map((master, index) => (
                  <div
                    key={master.id}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                      selectedMaster?.id === master.id 
                        ? 'border-[#00acf4] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                    onClick={() => handleMasterSelect(master)}
                  >
                    <div className="flex items-center gap-3">
                      {master.photoUrl && (
                        <img
                          src={master.photoUrl}
                          alt={`${master.firstName} ${master.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-medium">{master.firstName} {master.lastName}</h3>
                        {master.specialization && (
                          <p className="text-sm text-gray-600">{master.specialization}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Нет доступных мастеров для выбранных услуг
              </p>
            )}
          </CardContent>
        </Card>

        {/* Выбор времени */}
        {selectedDate && selectedMaster && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Выберите время
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00acf4]"></div>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {availableSlots.map((slot, index) => {
                    const isSelected = selectedTimeSlot?.time === slot.time
                    
                    return (
                      <Button
                        key={`${slot.time}-${index}-${slot.timezoneInfo?.salonTime || 'no-tz'}`}
                        variant="outline"
                        onClick={() => handleTimeSlotSelect(slot)}
                        disabled={!slot.available}
                        className={cn(
                          "text-sm border",
                          isSelected
                            ? 'bg-[#00acf4] hover:bg-[#0099f4] text-white border-[#00acf4]' 
                            : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
                          !slot.available && 'opacity-50 cursor-not-allowed'
                        )}
                        title={slot.timezoneInfo ? `Время салона: ${slot.timezoneInfo.salonTime}` : undefined}
                      >
                        {slot.time}
                      </Button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  На выбранную дату нет доступных слотов
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}