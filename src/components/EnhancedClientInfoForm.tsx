'use client'

import React, { useState } from 'react'
import { ClientInfo } from '@/types/booking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Phone, Mail, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedClientInfoFormProps {
  clientInfo: ClientInfo;
  onClientInfoChange: (info: ClientInfo) => void;
  onFormSubmit: () => void;
  className?: string;
}

export function EnhancedClientInfoForm({
  clientInfo,
  onClientInfoChange,
  onFormSubmit,
  className
}: EnhancedClientInfoFormProps) {
  const [errors, setErrors] = useState<Partial<ClientInfo>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<ClientInfo> = {}

    if (!clientInfo.name.trim()) {
      newErrors.name = 'Имя обязательно'
    }

    if (!clientInfo.phone.trim()) {
      newErrors.phone = 'Телефон обязателен'
    } else if (!/^[\+]?[1-9][\d]{10,14}$/.test(clientInfo.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Некорректный формат телефона'
    }

    if (clientInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientInfo.email)) {
      newErrors.email = 'Некорректный формат email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onFormSubmit()
    }
  }

  const handleInputChange = (field: keyof ClientInfo, value: string) => {
    onClientInfoChange({
      ...clientInfo,
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

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Ваши контактные данные
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={clientInfo.name}
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
                  value={clientInfo.phone}
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
                  value={clientInfo.email || ''}
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
                  value={clientInfo.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className={cn(
                    "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00acf4] focus:border-transparent resize-none"
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#00acf4] hover:bg-[#0099e0] text-white"
            >
              Продолжить к подтверждению
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}