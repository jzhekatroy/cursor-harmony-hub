'use client'

import React, { useState } from 'react'
import { Calendar, Clock, User, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActiveBooking {
  id: string
  bookingNumber: string
  startTime: string
  endTime: string
  totalPrice: number
  status: string
  master: {
    id: string
    name: string
  }
  services: Array<{
    id: string
    name: string
    price: number
  }>
}

interface ActiveBookingsNotificationProps {
  activeBookings: ActiveBooking[]
  onCancelBooking: (bookingId: string) => Promise<void>
  isLoading?: boolean
}

export default function ActiveBookingsNotification({
  activeBookings,
  onCancelBooking,
  isLoading = false
}: ActiveBookingsNotificationProps) {
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-600">Загружаем ваши записи...</span>
        </div>
      </div>
    )
  }

  if (!activeBookings || activeBookings.length === 0) {
    return null
  }

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingBookingId(bookingId)
    try {
      await onCancelBooking(bookingId)
    } catch (error) {
      console.error('Error cancelling booking:', error)
    } finally {
      setCancellingBookingId(null)
    }
  }

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString)
    const dateStr = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const timeStr = date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return { date: dateStr, time: timeStr }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className="space-y-4 mb-6">
      {activeBookings.map((booking) => {
        const { date, time } = formatDateTime(booking.startTime)
        const isCancelling = cancellingBookingId === booking.id
        
        return (
          <div
            key={booking.id}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-800">
                    У вас есть активная запись
                  </h3>
                </div>
                
                <div className="space-y-2 text-sm text-amber-700">
                  {/* Услуги */}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">
                      {booking.services.map(s => s.name).join(', ')}
                    </span>
                  </div>
                  
                  {/* Мастер */}
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-amber-600" />
                    <span>Мастер: {booking.master.name}</span>
                  </div>
                  
                  {/* Дата и время */}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>{date} в {time}</span>
                  </div>
                  
                  {/* Цена */}
                  <div className="text-amber-800 font-medium">
                    Стоимость: {formatPrice(Number(booking.totalPrice))}
                  </div>
                  
                  {/* Номер записи */}
                  <div className="text-xs text-amber-600">
                    № {booking.bookingNumber}
                  </div>
                </div>
              </div>
              
              {/* Кнопка отмены */}
              <div className="ml-4">
                <Button
                  onClick={() => handleCancelBooking(booking.id)}
                  disabled={isCancelling}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400",
                    isCancelling && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isCancelling ? (
                    <div className="flex items-center space-x-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-amber-600"></div>
                      <span>Отмена...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <X className="h-3 w-3" />
                      <span>Отменить</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
