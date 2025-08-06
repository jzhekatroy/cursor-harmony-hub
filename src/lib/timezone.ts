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