'use client'

import React, { useState } from 'react'
import { BookingData } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Calendar, Clock, User, Phone, Mail, MessageSquare, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingConfirmationProps {
  bookingData: BookingData;
  onConfirmBooking: () => void;
  className?: string;
}

export function BookingConfirmation({
  bookingData,
  onConfirmBooking,
  className
}: BookingConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      // Здесь будет отправка данных на сервер
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: bookingData.services.map(s => s.id),
          masterId: bookingData.master?.id,
          date: bookingData.date,
          time: bookingData.timeSlot?.time,
          clientName: bookingData.clientInfo.name,
          clientPhone: bookingData.clientInfo.phone,
          clientEmail: bookingData.clientInfo.email,
          notes: bookingData.clientInfo.notes,
        })
      })

      if (response.ok) {
        onConfirmBooking()
      } else {
        throw new Error('Ошибка при создании записи')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert('Произошла ошибка при создании записи. Попробуйте еще раз.')
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            Подтверждение записи
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Услуги */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Выбранные услуги:</h3>
            <div className="space-y-2">
              {bookingData.services.map(service => (
                <div key={service.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-600">{formatDuration(service.duration)}</p>
                  </div>
                  <p className="font-medium text-gray-900">{service.price} ₽</p>
                </div>
              ))}
            </div>
          </div>

          {/* Дата и время */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Дата и время:</h3>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">{formatDate(bookingData.date)}</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <p className="text-sm text-gray-600">{bookingData.timeSlot?.time}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Мастер */}
          {bookingData.master && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Мастер:</h3>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">{bookingData.master.firstName} {bookingData.master.lastName}</p>
                  {bookingData.master.specialization && (
                    <p className="text-sm text-gray-600">{bookingData.master.specialization}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Контактные данные */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Ваши данные:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2">
                <User className="w-4 h-4 text-gray-600" />
                <span>{bookingData.clientInfo.name}</span>
              </div>
              <div className="flex items-center gap-3 p-2">
                <Phone className="w-4 h-4 text-gray-600" />
                <span>{bookingData.clientInfo.phone}</span>
              </div>
              {bookingData.clientInfo.email && (
                <div className="flex items-center gap-3 p-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span>{bookingData.clientInfo.email}</span>
                </div>
              )}
              {bookingData.clientInfo.notes && (
                <div className="flex items-start gap-3 p-2">
                  <MessageSquare className="w-4 h-4 text-gray-600 mt-1" />
                  <span className="text-sm">{bookingData.clientInfo.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Итого */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span>Итого:</span>
              </div>
              <span className="text-[#00acf4]">{bookingData.totalPrice} ₽</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Общая продолжительность: {formatDuration(bookingData.totalDuration)}
            </p>
          </div>

          {/* Кнопка подтверждения */}
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
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
        </CardContent>
      </Card>
    </div>
  )
}