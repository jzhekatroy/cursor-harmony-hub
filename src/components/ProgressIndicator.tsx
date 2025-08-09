'use client'

import React from 'react'
import { BookingStep } from '@/types/booking'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep: BookingStep;
}

const steps: { id: BookingStep; name: string }[] = [
  { id: 'select-services', name: 'Услуги' },
  { id: 'select-date-time', name: 'Дата и время' },
  { id: 'client-info', name: 'Ваши данные' },
  { id: 'confirmation', name: 'Подтверждение' },
]

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)

  return (
    <div className="w-full flex justify-between items-center mb-8 relative">
      <div className="absolute left-0 right-0 h-1 bg-gray-200 rounded-full mx-4">
        <div
          className="h-full bg-[#00acf4] rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>
      </div>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            "relative z-10 flex flex-col items-center transition-all duration-300",
            index <= currentStepIndex ? 'text-[#00acf4]' : 'text-gray-400'
          )}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
              index <= currentStepIndex ? 'bg-[#00acf4] text-white' : 'bg-gray-200 text-gray-600',
              index === currentStepIndex && 'ring-2 ring-[#00acf4] ring-offset-2'
            )}
          >
            {index + 1}
          </div>
          <span className="mt-2 text-xs sm:text-sm text-center whitespace-nowrap hidden sm:block">
            {step.name}
          </span>
        </div>
      ))}
    </div>
  )
}