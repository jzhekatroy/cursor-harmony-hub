'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X } from 'lucide-react'

interface PhotoUploadProps {
  currentPhotoUrl?: string
  onPhotoChange: (photoUrl: string) => void
  onPhotoRemove: () => void
  className?: string
}

export default function PhotoUpload({ 
  currentPhotoUrl, 
  onPhotoChange, 
  onPhotoRemove,
  className = ''
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла на фронте
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP')
      return
    }

    // Проверяем размер файла
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setUploadError('Файл слишком большой. Максимальный размер: 5MB')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки файла')
      }

      const data = await response.json()
      onPhotoChange(data.url)

    } catch (error) {
      console.error('Ошибка загрузки фото:', error)
      setUploadError(error instanceof Error ? error.message : 'Ошибка загрузки файла')
    } finally {
      setIsUploading(false)
      // Очищаем input для возможности повторной загрузки того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = () => {
    onPhotoRemove()
    setUploadError(null)
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Фото мастера
      </label>
      
      <div className="flex items-start space-x-4">
        {/* Превью фото */}
        <div className="flex-shrink-0">
          {currentPhotoUrl ? (
            <div className="relative">
              <img
                src={currentPhotoUrl}
                alt="Фото мастера"
                className="h-24 w-24 rounded-full object-cover border-2 border-gray-300"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                title="Удалить фото"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
              <Camera className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Кнопки управления */}
        <div className="flex-1">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Загружается...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {currentPhotoUrl ? 'Изменить фото' : 'Загрузить фото'}
                </>
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <p className="mt-1 text-xs text-gray-500">
            JPEG, PNG, WebP до 5MB
          </p>

          {uploadError && (
            <p className="mt-1 text-xs text-red-600">
              {uploadError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}