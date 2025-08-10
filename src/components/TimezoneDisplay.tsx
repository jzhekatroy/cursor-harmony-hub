'use client'

import React from 'react'
import { Globe, Clock, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface TimezoneDisplayProps {
  salonTimezone: string
  clientTimezone: string
  difference: number
  className?: string
}

export function TimezoneDisplay({ 
  salonTimezone, 
  clientTimezone, 
  difference, 
  className 
}: TimezoneDisplayProps) {
  const getDifferenceText = () => {
    if (difference === 0) return 'Время одинаковое'
    if (difference > 0) return `+${difference}ч от времени салона`
    return `${difference}ч от времени салона`
  }

  const getTimezoneLabel = (timezone: string) => {
    const labels: Record<string, string> = {
      'Europe/Moscow': 'Москва',
      'Asia/Novosibirsk': 'Новосибирск',
      'Asia/Krasnoyarsk': 'Красноярск',
      'Asia/Irkutsk': 'Иркутск',
      'Asia/Vladivostok': 'Владивосток',
      'Asia/Magadan': 'Магадан',
      'Asia/Kamchatka': 'Камчатка',
      'UTC': 'UTC'
    }
    return labels[timezone] || timezone
  }

  return (
    <Card className={`bg-blue-50 border-blue-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-800">
                Временные зоны
              </span>
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700">
                  Ваше время: <strong>{getTimezoneLabel(clientTimezone)}</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700">
                  Время салона: <strong>{getTimezoneLabel(salonTimezone)}</strong>
                </span>
              </div>
              
              {difference !== 0 && (
                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {getDifferenceText()}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
