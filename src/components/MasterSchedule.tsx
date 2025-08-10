'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Clock, Calendar } from 'lucide-react'
import { formatTimeForAdmin } from '@/lib/timezone'

interface ScheduleItem {
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
}

interface Break {
  startTime: string
  endTime: string
}

interface DaySchedule {
  isWorkingDay: boolean
  startTime: string
  endTime: string
  breaks: Break[]
}

interface MasterSchedule {
  day: string;
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  breaks: Break[];
}

interface MasterScheduleProps {
  masterId: string
  isOpen: boolean
  onClose: () => void
  onSave: (schedule: MasterSchedule[]) => void
  initialSchedule?: MasterSchedule[]
  salonTimezone?: string // Добавляем временную зону салона
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Понедельник', short: 'Пн' },
  { id: 2, name: 'Вторник', short: 'Вт' },
  { id: 3, name: 'Среда', short: 'Ср' },
  { id: 4, name: 'Четверг', short: 'Чт' },
  { id: 5, name: 'Пятница', short: 'Пт' },
  { id: 6, name: 'Суббота', short: 'Сб' },
  { id: 0, name: 'Воскресенье', short: 'Вс' }
]

export default function MasterSchedule({ 
  masterId, 
  isOpen, 
  onClose, 
  onSave, 
  initialSchedule = [],
  salonTimezone = 'Europe/Moscow' // По умолчанию Москва
}: MasterScheduleProps) {
  const [schedule, setSchedule] = useState<MasterSchedule[]>(initialSchedule)
  const [selectedDay, setSelectedDay] = useState<string>('monday')
  const [startTime, setStartTime] = useState<string>('09:00')
  const [endTime, setEndTime] = useState<string>('18:00')
  const [breakStart, setBreakStart] = useState<string>('13:00')
  const [breakEnd, setBreakEnd] = useState<string>('14:00')
  const [isBreakEnabled, setIsBreakEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Инициализация расписания по умолчанию
  const initializeDefaultSchedule = () => {
    const defaultSchedule: MasterSchedule[] = []
    DAYS_OF_WEEK.forEach(day => {
      defaultSchedule.push({
        day: day.name.toLowerCase().substring(0, 3),
        isWorkingDay: day.id >= 1 && day.id <= 5, // Пн-Пт рабочие дни
        startTime: '09:00',
        endTime: '18:00',
        breakStart: '13:00',
        breakEnd: '14:00',
        breaks: [{ startTime: '13:00', endTime: '14:00' }]
      })
    })
    setSchedule(defaultSchedule)
  }

  // Загрузка расписания мастера
  const loadSchedule = async () => {
    if (!masterId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/masters/${masterId}/schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.schedules && data.schedules.length > 0) {
          // Преобразуем API данные в формат компонента
          const apiSchedule: MasterSchedule[] = []
          
          // Инициализируем все дни как выходные
          DAYS_OF_WEEK.forEach(day => {
                         apiSchedule.push({
               day: day.name.toLowerCase().substring(0, 3),
               isWorkingDay: false,
               startTime: '09:00',
               endTime: '18:00',
               breakStart: '13:00',
               breakEnd: '14:00',
               breaks: []
             })
          })

          // Заполняем данные из API
          data.schedules.forEach((item: ScheduleItem) => {
            const breaks: Break[] = []
            if (item.breakStart && item.breakEnd) {
              breaks.push({
                startTime: item.breakStart,
                endTime: item.breakEnd
              })
            }

                          apiSchedule[item.dayOfWeek] = {
                day: DAYS_OF_WEEK[item.dayOfWeek].name.toLowerCase().substring(0, 3),
                isWorkingDay: true,
                startTime: item.startTime,
                endTime: item.endTime,
                breakStart: item.breakStart || '13:00',
                breakEnd: item.breakEnd || '14:00',
                breaks: item.breakStart && item.breakEnd ? [{ startTime: item.breakStart, endTime: item.breakEnd }] : []
              }
          })

          setSchedule(apiSchedule)
        } else {
          // Нет расписания - используем по умолчанию
          initializeDefaultSchedule()
        }
      } else {
        const errorData = await response.json()
        setError(`Ошибка загрузки расписания: ${errorData.error}`)
        initializeDefaultSchedule()
      }
    } catch (error) {
      console.error('Error loading schedule:', error)
      setError('Ошибка соединения с сервером')
      initializeDefaultSchedule()
    } finally {
      setLoading(false)
    }
  }

  // Сохранение расписания
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Преобразуем данные компонента в формат API
      const schedules: ScheduleItem[] = []
      
      schedule.forEach((item, index) => {
        const daySchedule: ScheduleItem = {
          dayOfWeek: index, // Assuming index corresponds to dayOfWeek
          startTime: item.startTime,
          endTime: item.endTime
        }

        // Добавляем первый перерыв если есть
        if (item.breakStart && item.breakEnd) {
          daySchedule.breakStart = item.breakStart
          daySchedule.breakEnd = item.breakEnd
        }

        schedules.push(daySchedule)
      })

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/masters/${masterId}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ schedules })
      })

      if (response.ok) {
        onSave(schedule)
        onClose()
      } else {
        const errorData = await response.json()
        setError(`Ошибка сохранения: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
      setError('Ошибка соединения с сервером')
    } finally {
      setIsSaving(false)
    }
  }

  // Обновление дня расписания
  const updateDaySchedule = (dayIndex: number, updates: Partial<MasterSchedule>) => {
    setSchedule(prev => prev.map((item, index) => {
      if (index === dayIndex) {
        return {
          ...item,
          ...updates
        }
      }
      return item
    }))
  }

  // Добавление перерыва
  const addBreak = (dayIndex: number) => {
    const daySchedule = schedule[dayIndex]
    if (daySchedule && daySchedule.breaks.length < 3) { // Максимум 3 перерыва
      updateDaySchedule(dayIndex, {
        breaks: [
          ...daySchedule.breaks,
          { startTime: '12:00', endTime: '13:00' }
        ]
      })
    }
  }

  // Удаление перерыва
  const removeBreak = (dayIndex: number, breakIndex: number) => {
    const daySchedule = schedule[dayIndex]
    if (daySchedule) {
      updateDaySchedule(dayIndex, {
        breaks: daySchedule.breaks.filter((_, index) => index !== breakIndex)
      })
    }
  }

  // Обновление перерыва
  const updateBreak = (dayIndex: number, breakIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const daySchedule = schedule[dayIndex]
    if (daySchedule) {
      const updatedBreaks = [...daySchedule.breaks]
      updatedBreaks[breakIndex] = {
        ...updatedBreaks[breakIndex],
        [field]: value
      }
      updateDaySchedule(dayIndex, { breaks: updatedBreaks })
    }
  }

  useEffect(() => {
    if (isOpen && masterId) {
      loadSchedule()
    }
  }, [isOpen, masterId])

  if (!isOpen) return null

  const formatTimeForDisplay = (time: string) => {
    // Форматируем время для отображения в админке (без смещений)
    return formatTimeForAdmin(`2000-01-01T${time}:00`, salonTimezone)
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isOpen ? '' : 'hidden'}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Расписание мастера</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Информация о временной зоне */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-800">
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                Временная зона салона: {salonTimezone}
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Все времена отображаются в выбранной временной зоне салона
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Загрузка расписания...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const daySchedule = schedule[dayIndex] || {
                  day: day.name.toLowerCase().substring(0, 3),
                  isWorkingDay: false,
                  startTime: '09:00',
                  endTime: '18:00',
                  breakStart: '13:00',
                  breakEnd: '14:00',
                  breaks: []
                }

                return (
                  <div key={day.id} className="border border-gray-200 rounded-lg p-4">
                    {/* Название дня и переключатель */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{day.name}</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={daySchedule.isWorkingDay}
                          onChange={(e) => updateDaySchedule(dayIndex, { isWorkingDay: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Рабочий день</span>
                      </label>
                    </div>

                    {daySchedule.isWorkingDay && (
                      <div className="space-y-4">
                        {/* Рабочие часы */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Начало работы
                            </label>
                            <input
                              type="time"
                              value={daySchedule.startTime}
                              onChange={(e) => updateDaySchedule(dayIndex, { startTime: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Окончание работы
                            </label>
                            <input
                              type="time"
                              value={daySchedule.endTime}
                              onChange={(e) => updateDaySchedule(dayIndex, { endTime: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Перерывы */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              Перерывы
                            </label>
                            {daySchedule.breaks.length < 3 && (
                              <button
                                onClick={() => addBreak(dayIndex)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                                Добавить перерыв
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {daySchedule.breaks.map((breakItem, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={breakItem.startTime}
                                  onChange={(e) => updateBreak(dayIndex, index, 'startTime', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-400">—</span>
                                <input
                                  type="time"
                                  value={breakItem.endTime}
                                  onChange={(e) => updateBreak(dayIndex, index, 'endTime', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => removeBreak(dayIndex, index)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {daySchedule.breaks.length === 0 && (
                              <p className="text-sm text-gray-500 italic">Нет перерывов</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!daySchedule.isWorkingDay && (
                      <p className="text-gray-500 italic">Выходной день</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Футер */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={initializeDefaultSchedule}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Сбросить к умолчанию
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Отменить
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}