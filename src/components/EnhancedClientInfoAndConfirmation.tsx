'use client'

import React, { useState } from 'react'
import { ClientInfo, BookingData } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  User, Phone, Mail, MessageSquare, Calendar, Clock, 
  DollarSign, Check, ChevronDown, ChevronUp 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedClientInfoAndConfirmationProps {
  bookingData: BookingData;
  onClientInfoChange: (info: ClientInfo) => void;
  onBookingConfirmed: () => void;
  className?: string;
}

export function EnhancedClientInfoAndConfirmation({
  bookingData,
  onClientInfoChange,
  onBookingConfirmed,
  className
}: EnhancedClientInfoAndConfirmationProps) {
  const [errors, setErrors] = useState<Partial<ClientInfo>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showBookingSummary, setShowBookingSummary] = useState(true)

  const validateForm = (): boolean => {
    const newErrors: Partial<ClientInfo> = {}

    if (!bookingData.clientInfo.name.trim()) {
      newErrors.name = 'Имя обязательно'
    }

    if (!bookingData.clientInfo.phone.trim()) {
      newErrors.phone = 'Телефон обязателен'
    } else if (!/^[\+]?[1-9][\d]{10,14}$/.test(bookingData.clientInfo.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Некорректный формат телефона'
    }

    if (bookingData.clientInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.clientInfo.email)) {
      newErrors.email = 'Некорректный формат email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof ClientInfo, value: string) => {
    onClientInfoChange({
      ...bookingData.clientInfo,
      [field]: value
    })

    // Очищаем ошибку для этого поля при изменении
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleConfirm = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Отправляем данные на сервер
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamSlug: window.location.pathname.split('/')[2], // Извлекаем slug из URL
          serviceIds: bookingData.services.map(s => s.id),
          masterId: bookingData.master?.id,
          startTime: `${bookingData.date}T${bookingData.timeSlot?.time}:00`,
          clientData: {
            name: bookingData.clientInfo.name,
            phone: bookingData.clientInfo.phone,
            email: bookingData.clientInfo.email,
            notes: bookingData.clientInfo.notes,
          }
        })
      })

      if (response.ok) {
        onBookingConfirmed()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка при создании записи')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert(`Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours} ч`
    return `${hours} ч ${remainingMinutes} мин`
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Краткая сводка заказа */}
      <Card>
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setShowBookingSummary(!showBookingSummary)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Ваш заказ
            </div>
            {showBookingSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {showBookingSummary && (
          <CardContent className="space-y-4">
            {/* Услуги */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Услуги:</p>
              <div className="space-y-1">
                {bookingData.services.map(service => (
                  <div key={service.id} className="flex justify-between text-sm">
                    <span>{service.name}</span>
                    <span>{service.price} ₽</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Дата, время, мастер */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Дата:</p>
                <p>{formatDate(bookingData.date)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Время:</p>
                <p>{bookingData.timeSlot?.time}</p>
              </div>
              {bookingData.master && (
                <div className="sm:col-span-2">
                  <p className="font-medium text-gray-700">Мастер:</p>
                  <p>{bookingData.master.firstName} {bookingData.master.lastName}</p>
                </div>
              )}
            </div>

            {/* Итого */}
            <div className="border-t pt-3 flex justify-between items-center font-semibold">
              <span>Итого:</span>
              <span className="text-[#00acf4]">{bookingData.totalPrice} ₽</span>
            </div>
            <p className="text-xs text-gray-600">
              Продолжительность: {formatDuration(bookingData.totalDuration)}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Форма контактных данных */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Ваши контактные данные
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Имя */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Ваше имя *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Введите ваше имя"
                  value={bookingData.clientInfo.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={cn(
                    "pl-10",
                    errors.name ? 'border-red-500 focus:border-red-500' : ''
                  )}
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Телефон */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Номер телефона *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={bookingData.clientInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={cn(
                    "pl-10",
                    errors.phone ? 'border-red-500 focus:border-red-500' : ''
                  )}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (необязательно)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={bookingData.clientInfo.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={cn(
                    "pl-10",
                    errors.email ? 'border-red-500 focus:border-red-500' : ''
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Примечания */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Комментарий (необязательно)
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <textarea
                  id="notes"
                  placeholder="Дополнительные пожелания..."
                  value={bookingData.clientInfo.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className={cn(
                    "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00acf4] focus:border-transparent resize-none"
                  )}
                />
              </div>
            </div>

            {/* Кнопка подтверждения */}
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg mt-6"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Создаем запись...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Подтвердить запись
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
