'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null)
  const [rawImage, setRawImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [originalFileName, setOriginalFileName] = useState<string>('photo.jpg')

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

    // Переходим в режим предварительного просмотра и обрезки 1:1
    setUploadError(null)
    setOriginalFileName(file.name || 'photo.jpg')
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      setSelectedSrc(src)
      const img = new Image()
      img.onload = () => {
        setRawImage(img)
        setZoom(1)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  // Загрузка уже обрезанного (квадратного) изображения на сервер
  const uploadCroppedBlob = async (blob: Blob) => {
    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      const fileName = 'photo.jpg'
      formData.append('file', new File([blob], fileName, { type: 'image/jpeg' }))

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
      // Сбрасываем предпросмотр
      setSelectedSrc(null)
      setRawImage(null)
      setZoom(1)
    } catch (error) {
      console.error('Ошибка загрузки фото:', error)
      setUploadError(error instanceof Error ? error.message : 'Ошибка загрузки файла')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Подтвердить обрезку 1:1 и загрузить
  const handleConfirmCropAndUpload = async () => {
    if (!rawImage) return

    // Рисуем квадрат 1:1, 512x512 для хорошего качества
    const SIZE = 512
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Базовый масштаб, чтобы картинка покрыла квадрат (cover)
    const baseScale = Math.max(SIZE / rawImage.width, SIZE / rawImage.height)
    const scale = baseScale * zoom
    const drawWidth = rawImage.width * scale
    const drawHeight = rawImage.height * scale
    const dx = (SIZE - drawWidth) / 2
    const dy = (SIZE - drawHeight) / 2

    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(rawImage, dx, dy, drawWidth, drawHeight)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      await uploadCroppedBlob(blob)
    }, 'image/jpeg', 0.92)
  }

  const handleCancelCrop = () => {
    setSelectedSrc(null)
    setRawImage(null)
    setZoom(1)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
            {!selectedSrc && (
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
            )}
            
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

          {/* Режим предпросмотра и обрезки 1:1 */}
          {selectedSrc && (
            <div className="mt-4">
              <div className="w-64 h-64 bg-gray-100 rounded-md overflow-hidden relative">
                <img
                  src={selectedSrc}
                  alt="Предпросмотр"
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(-50%, -50%) scale(${zoom})`,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
              <div className="mt-3">
                <label className="block text-xs text-gray-600 mb-1">Масштаб</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  disabled={isUploading}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCropAndUpload}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={isUploading || !rawImage}
                >
                  {isUploading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}