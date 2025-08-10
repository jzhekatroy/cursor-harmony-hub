import { useState, useEffect } from 'react'

export function useClientTimezone() {
  const [clientTimezone, setClientTimezone] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Детектируем временную зону клиента
    try {
      // Пытаемся получить временную зону из браузера
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      if (timezone) {
        setClientTimezone(timezone)
      } else {
        // Fallback: вычисляем по смещению UTC
        const offset = -new Date().getTimezoneOffset()
        const hours = Math.floor(Math.abs(offset) / 60)
        const minutes = Math.abs(offset) % 60
        const sign = offset >= 0 ? '+' : '-'
        
        // Приблизительное определение временной зоны по смещению
        let fallbackTimezone = 'UTC'
        if (offset === 180) fallbackTimezone = 'Europe/Moscow' // +3
        else if (offset === 240) fallbackTimezone = 'Asia/Novosibirsk' // +4
        else if (offset === 300) fallbackTimezone = 'Asia/Krasnoyarsk' // +5
        else if (offset === 360) fallbackTimezone = 'Asia/Irkutsk' // +6
        else if (offset === 420) fallbackTimezone = 'Asia/Vladivostok' // +7
        else if (offset === 480) fallbackTimezone = 'Asia/Magadan' // +8
        else if (offset === 540) fallbackTimezone = 'Asia/Kamchatka' // +9
        
        setClientTimezone(fallbackTimezone)
      }
    } catch (error) {
      console.error('Ошибка детекции временной зоны:', error)
      setClientTimezone('UTC')
    } finally {
      setLoading(false)
    }
  }, [])

  return { clientTimezone, loading }
}

