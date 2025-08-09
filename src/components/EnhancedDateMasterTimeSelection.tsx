'use client'

import React, { useState, useEffect } from 'react'
import { Master, Service, TimeSlot } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  }, [selectedServices, availableMasters, selectedDate, selectedMaster, selectedTimeSlot, onDateTimeSelect])

  // Загружаем доступные слоты при изменении даты или мастера
  useEffect(() => {
    if (selectedDate && selectedMaster && selectedServices.length > 0) {
      loadAvailableSlots()
    }
  }, [selectedDate, selectedMaster, selectedServices])

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedMaster) return

    setLoading(true)
    try {
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)
      const response = await fetch(
        `/api/masters/${selectedMaster.id}/available-slots?date=${selectedDate}&duration=${totalDuration}`
      )
      
      if (response.ok) {
        const data = await response.json()

        
        // Преобразуем ответ API в нужный формат
        if (data.availableSlots && Array.isArray(data.availableSlots)) {
          const formattedSlots: TimeSlot[] = data.availableSlots.map((slot: any) => ({
            time: slot.start, // используем время начала как время слота
            available: true
          }))
          setAvailableSlots(formattedSlots)
        } else {
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
    onDateTimeSelect(selectedDate, selectedMaster, timeSlot)
  }

  return (
    <div className={cn("space-y-6", className)}>
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
            {dates.map(date => {
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
              {availableMasters.map(master => (
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
                {availableSlots.map(slot => (
                  <Button
                    key={slot.time}
                    variant={selectedTimeSlot?.time === slot.time ? 'default' : 'outline'}
                    onClick={() => handleTimeSlotSelect(slot)}
                    disabled={!slot.available}
                    className={cn(
                      "text-sm",
                      selectedTimeSlot?.time === slot.time && 'bg-[#00acf4] hover:bg-[#0099e0]',
                      !slot.available && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                На выбранную дату нет доступных слотов
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}