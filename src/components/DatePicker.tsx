'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  selectedDate: string
  onDateSelect: (date: string) => void
  className?: string
}

export default function DatePicker({ selectedDate, onDateSelect, className = '' }: DatePickerProps) {
  const initial = selectedDate ? new Date(selectedDate) : new Date()
  const [currentDate, setCurrentDate] = useState<Date>(new Date(initial.getFullYear(), initial.getMonth(), initial.getDate()))

  const toInputValue = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })

  const applyDate = (date: Date) => {
    setCurrentDate(date)
    onDateSelect(toInputValue(date))
  }

  const goPrevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    applyDate(d)
  }

  const goNextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    applyDate(d)
  }

  return (
    <div className={className}>
      <div className="mb-4 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Выберите дату</h3>
        <p className="text-sm text-blue-600 font-medium">{formatDisplayDate(currentDate)}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <button onClick={goPrevDay} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="date"
            value={toInputValue(currentDate)}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split('-').map(Number)
              const nd = new Date(y, (m || 1) - 1, d || 1)
              applyDate(nd)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={goNextDay} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}