'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Master, Service, TimeSlot } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClientTimezone } from '@/hooks/useClientTimezone'
// Убрали отображение информации о временных зонах в публичном виджете

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
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const { clientTimezone, loading: timezoneLoading } = useClientTimezone()

  // Отладочная информация для salonTimezone
  // console.log('🔍 EnhancedDateMasterTimeSelection: RENDER START - salonTimezone =', salonTimezone)
  // console.log('🔍 EnhancedDateMasterTimeSelection: selectedTimeSlot =', selectedTimeSlot?.time)
  // console.log('🔍 EnhancedDateMasterTimeSelection: masters count =', masters.length)
  // console.log('🔍 EnhancedDateMasterTimeSelection: selectedServices count =', selectedServices.length)

  // Проверяем что все необходимые пропсы доступны
  if (!salonTimezone) {
    // console.log('🔍 EnhancedDateMasterTimeSelection: salonTimezone is missing, rendering loading state')
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
    // console.log('🔍 useEffect: salonTimezone changed to:', salonTimezone)
  }, [salonTimezone])

  // Отслеживаем монтирование/размонтирование компонента
  useEffect(() => {
    // console.log('🔍 EnhancedDateMasterTimeSelection: Component mounted')
    return () => {
      // console.log('🔍 EnhancedDateMasterTimeSelection: Component unmounted')
    }
  }, [])

  // Загружаем доступные слоты при изменении даты, мастера или временной зоны клиента
  useEffect(() => {
    // console.log('🔍 useEffect: loadAvailableSlots triggered', {
    //   selectedDate,
    //   selectedMaster: selectedMaster?.id,
    //   clientTimezone,
    //   salonTimezone
    // })
    
    if (selectedDate && selectedMaster && clientTimezone && salonTimezone) {
      loadAvailableSlots()
    } else {
      // console.log('🔍 useEffect: missing required data for loadAvailableSlots', {
      //   hasSelectedDate: !!selectedDate,
      //   hasSelectedMaster: !!selectedMaster,
      //   hasClientTimezone: !!clientTimezone,
      //   hasSalonTimezone: !!salonTimezone
      // })
    }
  }, [selectedDate, selectedMaster, clientTimezone, salonTimezone])

  // Генерируем даты на следующие 14 дней (только рабочие дни)
  const generateDates = () => {
    const dates = []
    
    // Используем время салона для определения "сегодня"
    // Создаем дату в временной зоне салона
    const now = new Date()
    const salonTime = new Date(now.toLocaleString("en-US", {timeZone: salonTimezone}))
    
    // Добавляем отладочную информацию
    // console.log('🔍 generateDates: now (UTC) =', now.toISOString())
    // console.log('🔍 generateDates: salonTimezone =', salonTimezone)
    // console.log('🔍 generateDates: salonTime (local) =', salonTime.toLocaleString())
    
    let currentDate = new Date(salonTime)
    let daysAdded = 0
    let maxDays = 30 // Максимум дней для поиска, чтобы не зациклиться
    
    while (dates.length < 14 && daysAdded < maxDays) {
      const dateValue = currentDate.toISOString().split('T')[0]
      
      // Форматируем день недели в временной зоне салона
      const salonDate = new Date(dateValue + 'T00:00:00')
      const weekday = salonDate.toLocaleDateString('ru-RU', { 
        weekday: 'long', 
        timeZone: salonTimezone
      })
      const weekdayLabel = salonDate.toLocaleDateString('ru-RU', { 
        weekday: 'short', 
        timeZone: salonTimezone
      })
      
      // Проверяем, что это не выходной (суббота = 6, воскресенье = 0)
      const dayOfWeek = salonDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      if (!isWeekend) {
        dates.push({
          value: dateValue,
          label: `${weekdayLabel} ${currentDate.getDate()} ${currentDate.toLocaleDateString('ru-RU', { 
            month: 'short',
            timeZone: salonTimezone
          })}`
        })
        
        // Логируем каждую дату для отладки
        // if (dates.length <= 3) {
        //   console.log(`🔍 generateDates: date ${dates.length - 1} = ${dateValue} (${weekday})`)
        // }
      } else {
        // console.log(`🔍 generateDates: skipping weekend ${dateValue} (${weekday})`)
      }
      
      // Переходим к следующему дню
      currentDate.setDate(currentDate.getDate() + 1)
      daysAdded++
    }
    
    // console.log(`🔍 generateDates: generated ${dates.length} working days`)
    return dates
  }

  // Мемоизируем даты, чтобы избежать пересчета при каждом рендере
  // console.log('🔍 BEFORE useMemo: salonTimezone =', salonTimezone)
  const dates = useMemo(() => {
    // console.log('🔍 useMemo: generating dates for timezone =', salonTimezone)
    const result = generateDates()
    // console.log('🔍 useMemo: generated dates count =', result.length)
    return result
  }, [salonTimezone])
  // console.log('🔍 AFTER useMemo: dates count =', dates.length)

  // Мемоизируем доступных мастеров
  const availableMasters = useMemo(() => {
    // console.log('🔍 useMemo: filtering masters...')
    return masters.filter(master => {
      if (selectedServices.length === 0) return true
      
      // Проверяем что мастер может выполнить все выбранные услуги
      return selectedServices.every(service => 
        master.services && master.services.includes(service.id)
      )
    })
  }, [masters, selectedServices])

  // Автоматически выбираем первый рабочий день и первого мастера
  useEffect(() => {
    // console.log('🔍 useEffect: auto-select TRIGGERED with salonTimezone =', salonTimezone)
    
    // Используем время салона для определения "сегодня"
    const now = new Date()
    const salonTime = new Date(now.toLocaleString("en-US", {timeZone: salonTimezone}))
    const today = salonTime.toISOString().split('T')[0]
    
    // console.log('🔍 useEffect: auto-select - now (UTC) =', now.toISOString())
    // console.log('🔍 useEffect: auto-select - salonTime =', salonTime.toLocaleString())
    // console.log('🔍 useEffect: auto-select - today (salon) =', today)
    
    // Находим первый рабочий день (не выходной)
    const findFirstWorkingDay = (startDate: Date) => {
      let currentDate = new Date(startDate)
      let daysChecked = 0
      const maxDays = 10 // Максимум дней для поиска
      
      while (daysChecked < maxDays) {
        const dayOfWeek = currentDate.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        
        if (!isWeekend) {
          return currentDate.toISOString().split('T')[0]
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
        daysChecked++
      }
      
      // Если не нашли рабочий день, возвращаем сегодня
      return today
    }
    
    const firstWorkingDay = findFirstWorkingDay(salonTime)
    // console.log('🔍 useEffect: auto-select - firstWorkingDay =', firstWorkingDay)
    
    // Автоматически выбираем первый рабочий день, если дата не выбрана
    if (!selectedDate) {
      onDateTimeSelect(firstWorkingDay, selectedMaster, selectedTimeSlot)
    }
    
    // Автоматически выбираем первого доступного мастера, если мастер не выбран и есть услуги
    if (!selectedMaster && availableMasters.length > 0 && selectedServices.length > 0) {
      onDateTimeSelect(selectedDate || firstWorkingDay, availableMasters[0], null)
    }
  }, [selectedServices, availableMasters, selectedDate, selectedMaster, onDateTimeSelect, salonTimezone])



  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedMaster || !clientTimezone || !salonTimezone) return

    // console.log('🔍 loadAvailableSlots: loading slots for', selectedDate, selectedMaster.id)

    setLoading(true)
    try {
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)
      const url = `/api/masters/${selectedMaster.id}/available-slots?date=${selectedDate}&duration=${totalDuration}&clientTimezone=${clientTimezone}`
      
      // console.log('🔍 loadAvailableSlots: API URL =', url)
      // console.log('🔍 loadAvailableSlots: totalDuration =', totalDuration)
      
      const response = await fetch(url)
      
      // console.log('🔍 loadAvailableSlots: response status =', response.status)
      
      if (response.ok) {
        const data = await response.json()
        // console.log('🔍 loadAvailableSlots: API response data =', data)
        
        // Преобразуем ответ API в нужный формат
        if (data.availableSlots && Array.isArray(data.availableSlots)) {
          const formattedSlots: TimeSlot[] = data.availableSlots.map((slot: any) => ({
            time: slot.time, // используем поле time из API
            available: true,
            timezoneInfo: slot.timezoneInfo // сохраняем информацию о временной зоне
          }))
          // console.log('🔍 loadAvailableSlots: loaded', formattedSlots.length, 'slots')
          // console.log('🔍 loadAvailableSlots: first slot =', formattedSlots[0])
          setAvailableSlots(formattedSlots)
        } else {
          // console.log('🔍 loadAvailableSlots: no availableSlots in response')
          setAvailableSlots([])
        }
      } else {
        // console.error('🔍 loadAvailableSlots: API error', response.status, response.statusText)
        const errorText = await response.text()
        // console.error('🔍 loadAvailableSlots: error response body =', errorText)
        setAvailableSlots([])
      }
    } catch (error) {
      // console.error('🔍 loadAvailableSlots: fetch error', error)
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: string) => {
    // console.log('🔍 handleDateSelect: selecting date', date)
    onDateTimeSelect(date, selectedMaster, null)
  }

  const handleMasterSelect = (master: Master) => {
    // console.log('🔍 handleMasterSelect: selecting master', master.id, master.firstName)
    onDateTimeSelect(selectedDate, master, null)
  }

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    // console.log('🔍 handleTimeSlotSelect: selecting', timeSlot.time)
    onDateTimeSelect(selectedDate, selectedMaster, timeSlot)
  }

  // Показываем информацию о временных зонах
  const renderTimezoneInfo = () => null

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Выбор даты и времени
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Информация о временных зонах скрыта */}
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
                    <div className="flex items-center gap-4">
                      {/* Фото мастера */}
                      <div className="flex-shrink-0">
                        {master.photoUrl ? (
                          <img
                            src={master.photoUrl}
                            alt={`${master.firstName} ${master.lastName}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Информация о мастере */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-lg text-gray-900 truncate">
                          {master.firstName} {master.lastName}
                        </h3>
                        {master.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {master.description}
                          </p>
                        )}
                        {master.specialization && (
                          <p className="text-sm text-gray-500 mt-1">
                            {master.specialization}
                          </p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Выберите время
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate || !selectedMaster ? (
              <p className="text-center text-gray-500 py-8">Сначала выберите дату и мастера</p>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00acf4]"></div>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableSlots.map((slot, index) => {
                  const isSelected = selectedTimeSlot?.time === slot.time
                  
                  return (
                    <Button
                      key={`${slot.time}-${index}`}
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
                    >
                      {slot.time}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">На выбранную дату нет доступных слотов</p>
            )}
          </CardContent>
        </Card>

        {/* Кнопка Далее */}
        <div className="flex justify-end pt-2">
          <Button
            disabled={!selectedDate || !selectedMaster || !selectedTimeSlot}
            onClick={() => {
              if (selectedDate && selectedMaster && selectedTimeSlot) {
                onNext && onNext()
              }
            }}
            className="bg-[#00acf4] hover:bg-[#0099e0] text-white"
          >
            Далее
          </Button>
        </div>
      </CardContent>
    </Card>
  )
  
  // Логируем завершение рендера
  // console.log('🔍 EnhancedDateMasterTimeSelection: RENDER END - salonTimezone =', salonTimezone)
}