'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Edit3, AlertTriangle } from 'lucide-react'

interface Absence {
  id: string
  masterId: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  reason: string
  description?: string
  isRecurring: boolean
  createdAt: string
}

interface MasterAbsencesManagerProps {
  masterId: string
  masterName: string
  onClose: () => void
  embedded?: boolean
}

const ABSENCE_REASONS = [
  { value: 'VACATION', label: '🏖️ Отпуск', color: 'bg-blue-100 text-blue-800' },
  { value: 'SICK_LEAVE', label: '🤒 Больничный', color: 'bg-red-100 text-red-800' },
  { value: 'PERSONAL', label: '👤 Личные дела', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'TRAINING', label: '📚 Обучение', color: 'bg-green-100 text-green-800' },
  { value: 'OTHER', label: '❓ Другое', color: 'bg-gray-100 text-gray-800' }
]

const MasterAbsencesManager: React.FC<MasterAbsencesManagerProps> = ({
  masterId,
  masterName,
  onClose,
  embedded = false
}) => {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Форма отсутствия
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '18:00',
    reason: '',
    description: '',
    isRecurring: false
  })

  // Загружаем отсутствия
  const loadAbsences = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/masters/${masterId}/absences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки отсутствий')
      }

      const data = await response.json()
      setAbsences(data.absences || [])
    } catch (error) {
      console.error('Ошибка загрузки отсутствий:', error)
      alert('Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAbsences()
  }, [masterId])

  // Обработка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.startDate || !formData.endDate) {
      alert('Пожалуйста, заполните даты')
      return
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      alert('Дата начала не может быть позже даты окончания')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const url = editingAbsence 
        ? `/api/masters/${masterId}/absences/${editingAbsence.id}`
        : `/api/masters/${masterId}/absences`
      
      const method = editingAbsence ? 'PUT' : 'POST'
      // Собираем ISO-строки с учетом времени (по умолчанию 00:00 и 23:59)
      const startDateTime = `${formData.startDate}T${(formData.startTime || '00:00')}:00`
      const endDateTime = `${formData.endDate}T${(formData.endTime || '23:59')}:00`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: startDateTime,
          endDate: endDateTime,
          reason: formData.reason?.trim() || null,
          description: formData.description?.trim() || null,
          isRecurring: formData.isRecurring
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка сохранения')
      }

      // Обновляем список
      await loadAbsences()
      
      // Сбрасываем форму
      setFormData({
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '18:00',
        reason: '',
        description: '',
        isRecurring: false
      })
      setShowAddForm(false)
      setEditingAbsence(null)

    } catch (error: any) {
      console.error('Ошибка сохранения отсутствия:', error)
      alert(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Удаление отсутствия
  const handleDelete = async (absenceId: string) => {
    if (!confirm('Удалить это отсутствие?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/masters/${masterId}/absences/${absenceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Ошибка удаления')
      }

      await loadAbsences()
    } catch (error) {
      console.error('Ошибка удаления отсутствия:', error)
      alert('Ошибка удаления')
    }
  }

  // Редактирование отсутствия
  const handleEdit = (absence: Absence) => {
    // Функция для преобразования даты в формат YYYY-MM-DD
    const formatDateForInput = (dateInput: string | Date): string => {
      try {
        let date: Date
        
        if (typeof dateInput === 'string') {
          // Если уже в формате YYYY-MM-DD, оставляем как есть
          if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateInput
          }
          date = new Date(dateInput)
        } else {
          date = dateInput
        }
        
        if (isNaN(date.getTime())) {
          console.error('Invalid date for input:', dateInput)
          return ''
        }
        
        // Преобразуем в формат YYYY-MM-DD
        return date.toISOString().split('T')[0]
      } catch (error) {
        console.error('Error formatting date for input:', error, dateInput)
        return ''
      }
    }
    
    // Вытаскиваем время HH:mm из ISO
    const extractTime = (dateInput: string | Date): string => {
      try {
        const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
        if (isNaN(d.getTime())) return '00:00'
        const hh = d.getHours().toString().padStart(2, '0')
        const mm = d.getMinutes().toString().padStart(2, '0')
        return `${hh}:${mm}`
      } catch {
        return '00:00'
      }
    }
    
    setFormData({
      startDate: formatDateForInput(absence.startDate),
      endDate: formatDateForInput(absence.endDate),
      startTime: extractTime(absence.startDate),
      endTime: extractTime(absence.endDate),
      reason: absence.reason || '',
      description: absence.description || '',
      isRecurring: absence.isRecurring
    })
    setEditingAbsence(absence)
    setShowAddForm(true)
  }

  // Форматирование даты
  const formatDate = (dateInput: string | Date) => {
    try {
      let date: Date
      
      if (typeof dateInput === 'string') {
        // Если это строка в формате YYYY-MM-DD, добавляем время
        if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
          date = new Date(dateInput + 'T12:00:00')
        } else {
          date = new Date(dateInput)
        }
      } else {
        date = dateInput
      }
      
      // Проверяем валидность даты
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateInput)
        return 'Некорректная дата'
      }
      
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch (error) {
      console.error('Date formatting error:', error, dateInput)
      return 'Ошибка даты'
    }
  }

  // Получение причины
  const getReasonInfo = (reason: string) => {
    return ABSENCE_REASONS.find(r => r.value === reason) || ABSENCE_REASONS[4]
  }

  // Проверка на текущее отсутствие
  const isCurrentAbsence = (absence: Absence) => {
    try {
      const now = new Date()
      
      // Обрабатываем startDate
      let start: Date
      if (typeof absence.startDate === 'string') {
        start = absence.startDate.match(/^\d{4}-\d{2}-\d{2}$/) 
          ? new Date(absence.startDate + 'T00:00:00')
          : new Date(absence.startDate)
      } else {
        start = new Date(absence.startDate)
      }
      
      // Обрабатываем endDate
      let end: Date
      if (typeof absence.endDate === 'string') {
        end = absence.endDate.match(/^\d{4}-\d{2}-\d{2}$/)
          ? new Date(absence.endDate + 'T23:59:59')
          : new Date(absence.endDate)
      } else {
        end = new Date(absence.endDate)
      }
      
      // Проверяем валидность дат
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid dates in absence:', absence)
        return false
      }
      
      return now >= start && now <= end
    } catch (error) {
      console.error('Error checking current absence:', error, absence)
      return false
    }
  }

  if (isLoading) {
    return (
      embedded ? (
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Загружаем отсутствия...</span>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Загружаем отсутствия...</span>
            </div>
          </div>
        </div>
      )
    )
  }

  const card = (
    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              Отпуска и отсутствия
            </h2>
            <p className="text-gray-600 mt-1">Управление для: {masterName}</p>
          </div>
          {!embedded && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>

        {/* Кнопка добавления */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setEditingAbsence(null)
              setFormData({
                startDate: '',
                endDate: '',
                reason: 'VACATION',
                description: '',
                isRecurring: false
              })
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить отсутствие
          </button>
        </div>

        {/* Форма добавления/редактирования */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium mb-4">
              {editingAbsence ? 'Редактировать отсутствие' : 'Новое отсутствие'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время начала
                  </label>
                  <input
                    type="time"
                    value={formData.startTime || ''}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время окончания
                  </label>
                  <input
                    type="time"
                    value={formData.endTime || ''}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Причина отсутствия
                </label>
                <input
                  type="text"
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Например: личные дела, визит к врачу и т.п."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание (необязательно)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Дополнительная информация об отсутствии..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700">
                  Повторяющееся отсутствие (ежегодно)
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingAbsence(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Сохранение...' : editingAbsence ? 'Обновить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Список отсутствий */}
        <div className="space-y-4">
          {absences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Отсутствия не запланированы</p>
            </div>
          ) : (
            absences.map((absence) => {
              const reasonText = (absence.reason && absence.reason.trim()) ? absence.reason : 'Отсутствие'
              const isCurrent = isCurrentAbsence(absence)
              
              return (
                <div
                  key={absence.id}
                  className={`border rounded-lg p-4 ${isCurrent ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}>
                          {reasonText}
                        </span>
                        {isCurrent && (
                          <span className="flex items-center text-xs text-orange-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Сейчас отсутствует
                          </span>
                        )}
                        {absence.isRecurring && (
                          <span className="text-xs text-gray-500">🔄 Ежегодно</span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-900 mb-1">
                        <strong>
                          {formatDate(absence.startDate)} — {formatDate(absence.endDate)}
                        </strong>
                      </div>
                      
                      {absence.description && (
                        <p className="text-sm text-gray-600 mb-2">{absence.description}</p>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        Создано: {new Date(absence.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(absence)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Редактировать"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(absence.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {!embedded && (
          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Закрыть</button>
          </div>
        )}
      </div>
  )

  if (embedded) return card

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {card}
    </div>
  )
}

export default MasterAbsencesManager