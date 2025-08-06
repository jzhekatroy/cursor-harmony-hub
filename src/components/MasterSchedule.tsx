'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, X, Save, RotateCcw } from 'lucide-react'

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

interface MasterScheduleProps {
  masterId: string
  masterName: string
  isOpen: boolean
  onClose: () => void
  onSave: () => void
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

export default function MasterSchedule({ masterId, masterName, isOpen, onClose, onSave }: MasterScheduleProps) {
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Инициализация расписания по умолчанию
  const initializeDefaultSchedule = () => {
    const defaultSchedule: Record<number, DaySchedule> = {}
    DAYS_OF_WEEK.forEach(day => {
      defaultSchedule[day.id] = {
        isWorkingDay: day.id >= 1 && day.id <= 5, // Пн-Пт рабочие дни
        startTime: '09:00',
        endTime: '18:00',
        breaks: [{ startTime: '13:00', endTime: '14:00' }] // Обеденный перерыв
      }
    })
    setSchedule(defaultSchedule)
  }

  // Загрузка расписания мастера
  const loadSchedule = async () => {
    if (!masterId) return
    
    setIsLoading(true)
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
          const apiSchedule: Record<number, DaySchedule> = {}
          
          // Инициализируем все дни как выходные
          DAYS_OF_WEEK.forEach(day => {
            apiSchedule[day.id] = {
              isWorkingDay: false,
              startTime: '09:00',
              endTime: '18:00',
              breaks: []
            }
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
              isWorkingDay: true,
              startTime: item.startTime,
              endTime: item.endTime,
              breaks
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
      setIsLoading(false)
    }
  }

  // Сохранение расписания
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Преобразуем данные компонента в формат API
      const schedules: ScheduleItem[] = []
      
      Object.entries(schedule).forEach(([dayOfWeek, daySchedule]) => {
        if (daySchedule.isWorkingDay) {
          const scheduleItem: ScheduleItem = {
            dayOfWeek: parseInt(dayOfWeek),
            startTime: daySchedule.startTime,
            endTime: daySchedule.endTime
          }

          // Добавляем первый перерыв если есть
          if (daySchedule.breaks.length > 0) {
            scheduleItem.breakStart = daySchedule.breaks[0].startTime
            scheduleItem.breakEnd = daySchedule.breaks[0].endTime
          }

          schedules.push(scheduleItem)
        }
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
        onSave()
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
  const updateDaySchedule = (dayId: number, updates: Partial<DaySchedule>) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        ...updates
      }
    }))
  }

  // Добавление перерыва
  const addBreak = (dayId: number) => {
    const daySchedule = schedule[dayId]
    if (daySchedule && daySchedule.breaks.length < 3) { // Максимум 3 перерыва
      updateDaySchedule(dayId, {
        breaks: [
          ...daySchedule.breaks,
          { startTime: '12:00', endTime: '13:00' }
        ]
      })
    }
  }

  // Удаление перерыва
  const removeBreak = (dayId: number, breakIndex: number) => {
    const daySchedule = schedule[dayId]
    if (daySchedule) {
      updateDaySchedule(dayId, {
        breaks: daySchedule.breaks.filter((_, index) => index !== breakIndex)
      })
    }
  }

  // Обновление перерыва
  const updateBreak = (dayId: number, breakIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const daySchedule = schedule[dayId]
    if (daySchedule) {
      const updatedBreaks = [...daySchedule.breaks]
      updatedBreaks[breakIndex] = {
        ...updatedBreaks[breakIndex],
        [field]: value
      }
      updateDaySchedule(dayId, { breaks: updatedBreaks })
    }
  }

  useEffect(() => {
    if (isOpen && masterId) {
      loadSchedule()
    }
  }, [isOpen, masterId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Рабочее время
              </h2>
              <p className="text-sm text-gray-600">{masterName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Загрузка расписания...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {DAYS_OF_WEEK.map(day => {
                const daySchedule = schedule[day.id] || {
                  isWorkingDay: false,
                  startTime: '09:00',
                  endTime: '18:00',
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
                          onChange={(e) => updateDaySchedule(day.id, { isWorkingDay: e.target.checked })}
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
                              onChange={(e) => updateDaySchedule(day.id, { startTime: e.target.value })}
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
                              onChange={(e) => updateDaySchedule(day.id, { endTime: e.target.value })}
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
                                onClick={() => addBreak(day.id)}
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
                                  onChange={(e) => updateBreak(day.id, index, 'startTime', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-400">—</span>
                                <input
                                  type="time"
                                  value={breakItem.endTime}
                                  onChange={(e) => updateBreak(day.id, index, 'endTime', e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => removeBreak(day.id, index)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <X className="w-4 h-4" />
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
            <RotateCcw className="w-4 h-4" />
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
            disabled={isSaving || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}