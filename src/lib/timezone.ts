/**
 * Утилиты для работы с часовыми поясами
 */

// Карта часовых поясов и их смещений относительно UTC (в часах)
const TIMEZONE_OFFSETS: Record<string, number> = {
  'UTC': 0,
  'Europe/London': 0,
  'Europe/Kiev': 2,
  'Europe/Minsk': 3,
  'Europe/Moscow': 3,
  'Asia/Yekaterinburg': 5,
  'Asia/Tashkent': 5,
  'Asia/Almaty': 6,
  'Asia/Novosibirsk': 7,
  'Asia/Vladivostok': 10,
  'America/New_York': -5,
}

/**
 * Получает смещение часового пояса относительно UTC
 */
export function getTimezoneOffset(timezone: string): number {
  return TIMEZONE_OFFSETS[timezone] || 3 // по умолчанию Москва
}

/**
 * Конвертирует UTC время в время салона
 */
export function utcToSalonTime(utcDate: Date, salonTimezone: string): Date {
  const offsetHours = getTimezoneOffset(salonTimezone)
  return new Date(utcDate.getTime() + (offsetHours * 60 * 60 * 1000))
}

/**
 * Конвертирует время салона в UTC
 */
export function salonTimeToUtc(salonDate: Date, salonTimezone: string): Date {
  const offsetHours = getTimezoneOffset(salonTimezone)
  return new Date(salonDate.getTime() - (offsetHours * 60 * 60 * 1000))
}

/**
 * Получает текущее время в часовом поясе салона
 */
export function getCurrentSalonTime(salonTimezone: string): Date {
  const now = new Date()
  return utcToSalonTime(now, salonTimezone)
}

/**
 * Форматирует время в HH:mm для часового пояса салона
 */
export function formatSalonTime(date: Date, salonTimezone: string): string {
  const salonTime = utcToSalonTime(date, salonTimezone)
  const hours = salonTime.getUTCHours()
  const minutes = salonTime.getUTCMinutes()
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Получает время в минутах от полуночи для часового пояса салона
 */
export function getSalonTimeMinutes(date: Date, salonTimezone: string): number {
  const salonTime = utcToSalonTime(date, salonTimezone)
  return salonTime.getUTCHours() * 60 + salonTime.getUTCMinutes()
}

/**
 * Проверяет, является ли дата сегодняшней в часовом поясе салона
 */
export function isTodayInSalonTimezone(date: string, salonTimezone: string): boolean {
  const now = getCurrentSalonTime(salonTimezone)
  const currentDateStr = now.toISOString().split('T')[0]
  return date === currentDateStr
}

/**
 * Получает название часового пояса для отображения
 */
export function getTimezoneDisplayName(timezone: string): string {
  const names: Record<string, string> = {
    'UTC': 'UTC (универсальное время)',
    'Europe/London': 'Лондон (UTC+0)',
    'Europe/Kiev': 'Киев (UTC+2)',
    'Europe/Minsk': 'Минск (UTC+3)',
    'Europe/Moscow': 'Москва (UTC+3)',
    'Asia/Yekaterinburg': 'Екатеринбург (UTC+5)',
    'Asia/Tashkent': 'Ташкент (UTC+5)',
    'Asia/Almaty': 'Алматы (UTC+6)',
    'Asia/Novosibirsk': 'Новосибирск (UTC+7)',
    'Asia/Vladivostok': 'Владивосток (UTC+10)',
    'America/New_York': 'Нью-Йорк (UTC-5)',
  }
  return names[timezone] || timezone
}

// Утилиты для работы с временными зонами в админке

/**
 * Получает текущее время в указанной временной зоне
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    const now = new Date()
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const targetTime = new Date(utc + getTimezoneOffsetMinutes(timezone) * 60000)
    return targetTime
  } catch (error) {
    console.error('Ошибка получения времени в временной зоне:', error)
    return new Date()
  }
}

/**
 * Получает смещение временной зоны в минутах (для админки)
 */
export function getTimezoneOffsetMinutes(timezone: string): number {
  try {
    const now = new Date()
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const target = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    return (target.getTime() - utc.getTime()) / 60000
  } catch (error) {
    console.error('Ошибка получения смещения временной зоны:', error)
    return 0
  }
}

/**
 * Форматирует время в указанной временной зоне без смещения
 * Используется в админке для отображения времени строго по настройкам салона
 */
export function formatTimeInSalonTimezone(timeString: string, salonTimezone: string): string {
  try {
    // Если это уже время в формате HH:mm, возвращаем как есть
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString
    }

    // Парсим дату
    const date = new Date(timeString)
    if (isNaN(date.getTime())) {
      return timeString
    }

    // Форматируем время в временной зоне салона
    return date.toLocaleTimeString('ru-RU', {
      timeZone: salonTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch (error) {
    console.error('Ошибка форматирования времени:', error)
    return timeString
  }
}

/**
 * Создает дату в временной зоне салона
 * Используется для создания временных слотов и проверок
 */
export function createDateInSalonTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  salonTimezone: string
): Date {
  try {
    // Создаем дату в UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
    
    // Получаем смещение временной зоны салона
    const offset = getTimezoneOffsetMinutes(salonTimezone)
    
    // Применяем смещение
    const salonDate = new Date(utcDate.getTime() - (offset * 60000))
    
    return salonDate
  } catch (error) {
    console.error('Ошибка создания даты в временной зоне салона:', error)
    return new Date(year, month - 1, day, hour, minute, 0, 0)
  }
}

/**
 * Проверяет, является ли время прошедшим в временной зоне салона
 */
export function isPastTimeInSalonTimezone(
  date: Date,
  time: string,
  salonTimezone: string
): boolean {
  try {
    const now = getCurrentTimeInTimezone(salonTimezone)
    const checkDateTime = new Date(date)
    const [hours, minutes] = time.split(':').map(Number)
    checkDateTime.setHours(hours, minutes, 0, 0)
    
    return checkDateTime < now
  } catch (error) {
    console.error('Ошибка проверки прошедшего времени:', error)
    return false
  }
}

/**
 * Получает текущее время в админке (временная зона салона)
 */
export function getCurrentTimeForAdmin(salonTimezone: string): Date {
  return getCurrentTimeInTimezone(salonTimezone)
}

/**
 * Форматирует время для отображения в админке
 * Всегда показывает время строго по настройкам салона
 */
export function formatTimeForAdmin(timeString: string, salonTimezone: string): string {
  return formatTimeInSalonTimezone(timeString, salonTimezone)
}

// Функции для клиентского бронирования

/**
 * Конвертирует время из временной зоны салона во временную зону клиента
 */
export function convertSalonTimeToClientTime(
  salonTime: string, // формат "HH:mm"
  salonTimezone: string,
  clientTimezone: string,
  date: string // формат "YYYY-MM-DD"
): string {
  try {
    // Если временные зоны одинаковые, возвращаем исходное время
    if (salonTimezone === clientTimezone) {
      return salonTime
    }
    
    // Создаем дату в указанной временной зоне
    const [hours, minutes] = salonTime.split(':').map(Number)
    
    // Создаем строку даты в формате, который будет интерпретирован как время в указанной зоне
    const dateTimeString = `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
    
    // Создаем дату, интерпретируя время как время в указанной временной зоне
    const salonDate = new Date(dateTimeString)
    
    // Получаем смещение временной зоны салона в минутах
    const salonOffset = getTimezoneOffsetMinutes(salonTimezone)
    
    // Получаем смещение временной зоны клиента в минутах
    const clientOffset = getTimezoneOffsetMinutes(clientTimezone)
    
    // Вычисляем разницу в минутах
    const offsetDifference = clientOffset - salonOffset
    
    // Применяем разницу к времени
    const totalMinutes = hours * 60 + minutes + offsetDifference
    
    // Конвертируем обратно в формат HH:mm
    const resultHours = Math.floor(totalMinutes / 60)
    const resultMinutes = totalMinutes % 60
    
    // Обрабатываем переход через день
    let resultDate = new Date(date)
    if (totalMinutes < 0) {
      resultDate.setDate(resultDate.getDate() - 1)
      const adjustedMinutes = totalMinutes + 24 * 60
      const adjustedHours = Math.floor(adjustedMinutes / 60)
      const adjustedMins = adjustedMinutes % 60
      const result = `${adjustedHours.toString().padStart(2, '0')}:${adjustedMins.toString().padStart(2, '0')}`
      return result
    } else if (totalMinutes >= 24 * 60) {
      resultDate.setDate(resultDate.getDate() + 1)
      const adjustedMinutes = totalMinutes - 24 * 60
      const adjustedHours = Math.floor(adjustedMinutes / 60)
      const adjustedMins = adjustedMinutes % 60
      const result = `${adjustedHours.toString().padStart(2, '0')}:${adjustedMins.toString().padStart(2, '0')}`
      return result
    }
    
    const result = `${resultHours.toString().padStart(2, '0')}:${resultMinutes.toString().padStart(2, '0')}`
    
    return result
  } catch (error) {
    console.error('Ошибка конвертации времени:', error)
    return salonTime
  }
}

/**
 * Получает смещение между временными зонами в часах
 */
export function getTimezoneDifference(
  salonTimezone: string,
  clientTimezone: string
): number {
  try {
    const now = new Date()
    
    // Время в временной зоне салона
    const salonTime = new Date(now.toLocaleString('en-US', { timeZone: salonTimezone }))
    
    // Время во временной зоне клиента
    const clientTime = new Date(now.toLocaleString('en-US', { timeZone: clientTimezone }))
    
    // Разница в миллисекундах
    const diffMs = clientTime.getTime() - salonTime.getTime()
    
    // Конвертируем в часы
    return Math.round(diffMs / (1000 * 60 * 60))
  } catch (error) {
    console.error('Ошибка получения разницы временных зон:', error)
    return 0
  }
}

/**
 * Форматирует время для отображения клиенту с указанием обеих временных зон
 */
export function formatTimeForClient(
  salonTime: string,
  salonTimezone: string,
  clientTimezone: string,
  date: string
): {
  salonTime: string
  clientTime: string
  timezoneInfo: string
} {
  const clientTime = convertSalonTimeToClientTime(salonTime, salonTimezone, clientTimezone, date)
  const difference = getTimezoneDifference(salonTimezone, clientTimezone)

  let timezoneInfo = ''
  if (difference === 0) {
    timezoneInfo = 'Время одинаковое'
  } else if (difference > 0) {
    timezoneInfo = `+${difference}ч от времени салона`
  } else {
    timezoneInfo = `${difference}ч от времени салона`
  }

  return {
    salonTime,
    clientTime,
    timezoneInfo
  }
}