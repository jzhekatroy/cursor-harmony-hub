'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  className?: string
}

export default function DatePicker({ selectedDate, onDateSelect, className = '' }: DatePickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(true) // Всегда показываем календарь

  // Форматируем дату для отображения
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Выберите дату'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    })
  }

  // Обработка клика по дате в календаре
  const handleDateClick = (dateClickInfo: any) => {
    const selectedDateStr = dateClickInfo.dateStr
    console.log('📅 Выбрана дата:', selectedDateStr)
    onDateSelect(selectedDateStr)
  }

  // Проверяем, можно ли выбрать дату (не в прошлом)
  const isDateSelectable = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  // Настройки календаря
  const calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next'
    },
    height: 'auto',
    contentHeight: 'auto',
    selectable: true,
    selectMirror: true,
    dayMaxEvents: false,
    weekends: true,
    locale: 'ru',
    firstDay: 1, // Понедельник первый день недели
    dateClick: handleDateClick,
    selectConstraint: {
      start: new Date().toISOString().split('T')[0] // Не позволяем выбирать прошлые даты
    },
    dayCellClassNames: (arg: any) => {
      const date = new Date(arg.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (date < today) {
        return ['fc-day-disabled']
      }
      
      if (arg.dateStr === selectedDate) {
        return ['fc-day-selected']
      }
      
      return []
    },
    titleFormat: { year: 'numeric' as const, month: 'long' as const }
  }

  return (
    <div className={`${className}`}>
      {/* Выбранная дата */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Выберите дату</h3>
        {selectedDate && (
          <p className="text-sm text-blue-600 font-medium">
            Выбрано: {formatDisplayDate(selectedDate)}
          </p>
        )}
      </div>

      {/* Календарь (всегда показан) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <style jsx global>{`
              .fc {
                font-family: inherit;
              }
              .fc-header-toolbar {
                margin-bottom: 1rem;
              }
              .fc-toolbar-title {
                font-size: 1.125rem;
                font-weight: 600;
                color: #1f2937;
              }
              .fc-button {
                background: #f3f4f6 !important;
                border: 1px solid #d1d5db !important;
                color: #374151 !important;
                font-weight: 500;
                padding: 0.5rem 0.75rem;
                border-radius: 0.5rem;
              }
              .fc-button:hover {
                background: #e5e7eb !important;
                border-color: #9ca3af !important;
              }
              .fc-button:focus {
                box-shadow: 0 0 0 2px #3b82f6 !important;
              }
              .fc-day {
                cursor: pointer;
                transition: background-color 0.2s;
              }
              .fc-day:hover {
                background-color: #eff6ff;
              }
              .fc-day-selected {
                background-color: #dbeafe !important;
                color: #1d4ed8 !important;
                font-weight: 600;
              }
              .fc-day-disabled {
                background-color: #f9fafb !important;
                color: #9ca3af !important;
                cursor: not-allowed !important;
              }
              .fc-day-disabled:hover {
                background-color: #f9fafb !important;
              }
              .fc-daygrid-day-number {
                padding: 0.5rem;
                font-weight: 500;
              }
              .fc-col-header-cell {
                background-color: #f8fafc;
                border-bottom: 2px solid #e2e8f0;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                font-size: 0.75rem;
                letter-spacing: 0.05em;
              }
              .fc-scrollgrid {
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                overflow: hidden;
              }
              .fc-theme-standard td, .fc-theme-standard th {
                border: 1px solid #f3f4f6;
              }
            `}</style>
            
            <FullCalendar {...calendarOptions} />
            
            <div className="mt-4 text-center text-sm text-gray-500">
              <span>Кликните на дату для выбора</span>
            </div>
          </div>
        </div>
  )
}