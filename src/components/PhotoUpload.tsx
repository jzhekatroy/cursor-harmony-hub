'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X } from 'lucide-react'

interface PhotoUploadProps {
  currentPhotoUrl?: string
  onPhotoChange: (photoUrl: string) => void
  onPhotoRemove: () => void
  className?: string
  label?: string
}

export default function PhotoUpload({ 
  currentPhotoUrl, 
  onPhotoChange, 
  onPhotoRemove,
  className = '',
  label = 'Фото'
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null)
  const [rawImage, setRawImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [originalFileName, setOriginalFileName] = useState<string>('photo.jpg')
  const [offsetX, setOffsetX] = useState<number>(0)
  const [offsetY, setOffsetY] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)

  const beginCropForSource = (src: string) => {
    setSelectedSrc(src)
    const img = new Image()
    img.onload = () => {
      setRawImage(img)
      setZoom(1)
      setOffsetX(0)
      setOffsetY(0)
    }
    img.src = src
  }

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

    // Загружаем файл сразу без обрезки/масштабирования
    try {
      setUploadError(null)
      setOriginalFileName(file.name || 'photo.jpg')
      await uploadCroppedBlob(file)
    } catch (e) {
      console.error(e)
    }
  }

  const handleEditExistingPhoto = () => {
    // Редактирование отключено: загружаем новое фото вместо обрезки
    fileInputRef.current?.click()
  }

  // Загрузка файла на сервер (без обрезки/масштаба)
  const uploadCroppedBlob = async (blob: Blob) => {
    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', blob)

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

  // Подтверждение отключено
  const handleConfirmCropAndUpload = async () => { /* no-op */ }

  const handleCancelCrop = () => {
    setSelectedSrc(null)
    setRawImage(null)
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = () => {
    onPhotoRemove()
    setUploadError(null)
  }

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!isDragging || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    setOffsetX((prev) => prev + dx)
    setOffsetY((prev) => prev + dy)
  }

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    setIsDragging(false)
    dragStartRef.current = null
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="flex items-start space-x-4">
        {/* Превью фото */}
        <div className="flex-shrink-0">
          {currentPhotoUrl ? (
            <div className="relative">
              <img
                src={currentPhotoUrl}
                alt={label}
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
                    {currentPhotoUrl ? 'Заменить фото' : 'Загрузить фото'}
                  </>
                )}
              </button>
            )}

            {/* Кнопка обрезки/масштаба удалена по требованиям: используем только замену фото */}
            
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
              <div
                ref={previewRef}
                className={`w-64 h-64 bg-gray-100 rounded-md overflow-hidden relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <img
                  src={selectedSrc}
                  alt="Предпросмотр"
                  className="absolute top-1/2 left-1/2 select-none"
                  draggable={false}
                  style={{
                    transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
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
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setOffsetX(0); setOffsetY(0); }}
                    className="px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Сбросить позицию
                  </button>
                  <span className="text-xs text-gray-500">Можно увеличивать и двигать изображение</span>
                </div>
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