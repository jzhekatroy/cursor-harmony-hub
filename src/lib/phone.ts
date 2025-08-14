import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function toE164(raw: string, defaultCountry: string = 'RU'): { e164: string | null; error?: string } {
  if (!raw) return { e164: null, error: 'Пустой номер' }
  let input = String(raw).trim()
  // Спец-обработка популярной формы для РФ: 8XXXXXXXXXX -> +7XXXXXXXXXX
  if (/^8\d{10}$/.test(input) && defaultCountry === 'RU') {
    input = '+7' + input.slice(1)
  }
  const cleaned = input.replace(/[^\d+]/g, '')
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry as any)
  if (!parsed || !parsed.isValid()) return { e164: null, error: 'Некорректный номер' }
  return { e164: parsed.number }
}


