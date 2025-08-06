'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'

interface MasterLimitSettingsProps {
  currentLimit: number
  activeMastersCount: number
  onLimitChange: (newLimit: number) => void
  disabled?: boolean
}

export default function MasterLimitSettings({
  currentLimit,
  activeMastersCount,
  onLimitChange,
  disabled = false
}: MasterLimitSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newLimit, setNewLimit] = useState(currentLimit)

  const handleSave = () => {
    if (newLimit < activeMastersCount) {
      alert(`Нельзя установить лимит (${newLimit}) меньше текущего количества активных мастеров (${activeMastersCount})`)
      return
    }
    
    if (newLimit < 1) {
      alert('Лимит не может быть меньше 1')
      return
    }

    if (newLimit > 50) {
      alert('Максимальный лимит: 50 мастеров')
      return
    }

    onLimitChange(newLimit)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setNewLimit(currentLimit)
    setIsEditing(false)
  }

  const getLimitColor = () => {
    const percentage = (activeMastersCount / currentLimit) * 100
    if (percentage >= 100) return 'text-red-600'
    if (percentage >= 80) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = () => {
    const percentage = (activeMastersCount / currentLimit) * 100
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Лимит мастеров</h3>
        </div>
        
        {!isEditing && !disabled && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Изменить
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Новый лимит
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={newLimit}
              onChange={(e) => setNewLimit(parseInt(e.target.value) || 1)}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Сохранить
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Занято:</span>
            <span className={`font-medium ${getLimitColor()}`}>
              {activeMastersCount} из {currentLimit}
            </span>
          </div>
          
          {/* Прогресс-бар */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{
                width: `${Math.min((activeMastersCount / currentLimit) * 100, 100)}%`
              }}
            />
          </div>
          
          <div className="text-xs text-gray-500">
            {currentLimit - activeMastersCount > 0 
              ? `Свободно: ${currentLimit - activeMastersCount}`
              : 'Лимит исчерпан'
            }
          </div>
        </div>
      )}
    </div>
  )
}