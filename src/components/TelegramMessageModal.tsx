import { useState } from 'react'

interface TelegramMessageModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onSend: (message: string) => Promise<void>
}

export default function TelegramMessageModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onSend
}: TelegramMessageModalProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return

    setIsLoading(true)
    try {
      await onSend(message)
      setMessage('')
      onClose()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Отправить сообщение в Telegram
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Клиент: <strong>{clientName}</strong>
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите текст сообщения..."
          className="w-full h-32 p-3 border rounded-lg resize-none"
          disabled={isLoading}
        />
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
            disabled={isLoading}
          >
            Отмена
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  )
}
