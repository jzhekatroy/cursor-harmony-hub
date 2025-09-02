'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LogoUploadProps {
  currentLogoUrl?: string
  onLogoChange: (logoUrl: string) => void
  onLogoRemove: () => void
  className?: string
  label?: string
}

export default function LogoUpload({ 
  currentLogoUrl, 
  onLogoChange, 
  onLogoRemove,
  className = '',
  label = 'Логотип'
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла на фронте
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP, SVG')
      return
    }

    // Проверяем размер файла (максимум 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      setUploadError('Файл слишком большой. Максимальный размер: 2MB')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка загрузки')
      }

      onLogoChange(result.url)
    } catch (error) {
      console.error('Ошибка загрузки логотипа:', error)
      setUploadError(error instanceof Error ? error.message : 'Ошибка загрузки логотипа')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    onLogoRemove()
    setUploadError(null)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {/* Превью текущего логотипа */}
      {currentLogoUrl && (
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
            <img
              src={currentLogoUrl}
              alt="Логотип салона"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Если изображение не загрузилось, показываем иконку
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            title="Удалить логотип"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Кнопка загрузки */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {currentLogoUrl ? 'Изменить логотип' : 'Загрузить логотип'}
            </>
          )}
        </Button>

        {/* Скрытый input для выбора файла */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Ошибка загрузки */}
        {uploadError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {uploadError}
          </div>
        )}

        {/* Рекомендации по размеру */}
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Рекомендуемые размеры:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Квадратный формат: 200x200px - 512x512px</li>
            <li>Прямоугольный: 200x100px - 400x200px</li>
            <li>Форматы: PNG, JPG, WebP, SVG</li>
            <li>Максимальный размер файла: 2MB</li>
          </ul>
          <p className="mt-2">
            <strong>Совет:</strong> Логотип должен быть четким и читаемым в маленьком размере. 
            Избегайте мелких деталей и используйте контрастные цвета.
          </p>
        </div>
      </div>
    </div>
  )
}
