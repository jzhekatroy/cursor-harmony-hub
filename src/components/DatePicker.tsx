'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  className?: string
}

export default function DatePicker({ selectedDate, onDateSelect, className = '' }: DatePickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)

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

  // Обработка выбора даты в календаре
  const handleDateSelect = (selectInfo: any) => {
    const selectedDateStr = selectInfo.dateStr
    onDateSelect(selectedDateStr)
    setShowCalendar(false)
  }

  // Проверяем, можно ли выбрать дату (не в прошлом)
  const isDateSelectable = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  // Настройки календаря
  const calendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev',
      center: 'title',
      right: 'next'
    },
    height: 400,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: false,
    weekends: true,
    locale: 'ru',
    firstDay: 1, // Понедельник первый день недели
    select: handleDateSelect,
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
    titleFormat: { year: 'numeric', month: 'long' }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Кнопка выбора даты */}
      <button
        type="button"
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className={`text-left ${selectedDate ? 'text-gray-900' : 'text-gray-500'}`}>
            {formatDisplayDate(selectedDate)}
          </span>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transform transition-transform ${showCalendar ? 'rotate-90' : ''}`} />
      </button>

      {/* Календарь */}
      {showCalendar && (
        <>
          {/* Overlay для закрытия */}
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setShowCalendar(false)}
          />
          
          {/* Календарь */}
          <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
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
            
            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
              <span>Выберите дату для записи</span>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
              >
                Закрыть
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}