import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TimeSlot {
  start: string // HH:mm format
  end: string   // HH:mm format
}

// GET - получить свободные слоты мастера на дату
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let masterId = ''
  let date = ''
  let serviceDuration = 60
  
  try {
    const { searchParams } = new URL(request.url)
    date = searchParams.get('date') || '' // YYYY-MM-DD format
    serviceDuration = parseInt(searchParams.get('duration') || '60') // минуты

    if (!date) {
      return NextResponse.json(
        { error: 'Параметр date обязателен' },
        { status: 400 }
      )
    }

    const resolvedParams = await params
    masterId = resolvedParams.id

    // Получаем мастера с командой для настроек
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      include: {
        team: true,
        schedules: true,
        absences: true,
        bookings: {
          where: {
            startTime: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lt: new Date(`${date}T23:59:59.999Z`)
            },
            status: {
              not: 'CANCELLED_BY_CLIENT'
            }
          }
        }
      }
    })

    if (!master) {
      return NextResponse.json(
        { error: 'Мастер не найден' },
        { status: 404 }
      )
    }

    if (!master.isActive) {
      return NextResponse.json(
        { error: 'Мастер неактивен' },
        { status: 400 }
      )
    }

    const requestDate = new Date(date)
    const dayOfWeek = requestDate.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Проверяем отпуска/отсутствия
    const hasAbsence = master.absences.some(absence => {
      const startDate = new Date(absence.startDate)
      const endDate = new Date(absence.endDate)
      return requestDate >= startDate && requestDate <= endDate
    })

    if (hasAbsence) {
      return NextResponse.json({
        date,
        masterId,
        masterName: `${master.firstName} ${master.lastName}`,
        availableSlots: [],
        message: 'Мастер отсутствует в этот день'
      })
    }

    // Получаем расписание на этот день недели
    const daySchedule = master.schedules.find(schedule => 
      schedule.dayOfWeek === dayOfWeek
    )

    if (!daySchedule) {
      return NextResponse.json({
        date,
        masterId,
        masterName: `${master.firstName} ${master.lastName}`,
        availableSlots: [],
        message: 'Мастер не работает в этот день недели'
      })
    }

    // Генерируем все возможные слоты
    const bookingStep = master.team.bookingStep
    const workingSlots = generateWorkingSlots(
      daySchedule.startTime,
      daySchedule.endTime,
      daySchedule.breakStart,
      daySchedule.breakEnd,
      bookingStep,
      serviceDuration
    )

    // Фильтруем занятые слоты
    const occupiedSlots = master.bookings.map(booking => ({
      start: formatTime(booking.startTime),
      end: formatTime(booking.endTime)
    }))

    // Получаем текущее время для фильтрации прошедших слотов
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM
    const isToday = requestDate.toDateString() === now.toDateString()

    const availableSlots = workingSlots.filter(slot => {
      // Исключаем занятые слоты
      if (isSlotOccupied(slot, occupiedSlots)) {
        return false
      }
      
      // Если это сегодня, исключаем прошедшие слоты
      if (isToday && slot.start <= currentTime) {
        return false
      }
      
      return true
    })

    return NextResponse.json({
      date,
      masterId,
      masterName: `${master.firstName} ${master.lastName}`,
      bookingStep,
      serviceDuration,
      workingHours: {
        start: daySchedule.startTime,
        end: daySchedule.endTime,
        breakStart: daySchedule.breakStart,
        breakEnd: daySchedule.breakEnd
      },
      availableSlots,
      occupiedSlots
    })

  } catch (error) {
    console.error('Ошибка получения свободных слотов:', error)
    
    // Более подробная информация об ошибке для отладки
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    const errorStack = error instanceof Error ? error.stack : 'Нет стека'
    
    console.error('Детали ошибки:', {
      message: errorMessage,
      stack: errorStack,
      masterId,
      date,
      serviceDuration
    })
    
    return NextResponse.json(
      { 
        error: 'Ошибка получения свободных слотов',
        details: errorMessage,
        masterId,
        date 
      },
      { status: 500 }
    )
  } finally {
    // Не отключаем singleton Prisma клиент
  }
}

// Генерирует все рабочие слоты с учетом перерывов
function generateWorkingSlots(
  startTime: string,
  endTime: string,
  breakStart: string | null,
  breakEnd: string | null,
  stepMinutes: number,
  serviceDuration: number
): TimeSlot[] {
  const slots: TimeSlot[] = []
  
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  const breakStartTime = breakStart ? parseTime(breakStart) : null
  const breakEndTime = breakEnd ? parseTime(breakEnd) : null

  let current = start
  
  while (current + serviceDuration <= end) {
    const slotEnd = current + serviceDuration
    
    // Проверяем, не пересекается ли слот с перерывом
    if (breakStartTime && breakEndTime) {
      const slotStartsInBreak = current >= breakStartTime && current < breakEndTime
      const slotEndsInBreak = slotEnd > breakStartTime && slotEnd <= breakEndTime
      const slotCoversBreak = current < breakStartTime && slotEnd > breakEndTime
      
      if (slotStartsInBreak || slotEndsInBreak || slotCoversBreak) {
        // Пропускаем этот слот и переходим к концу перерыва
        if (current < breakEndTime) {
          current = breakEndTime
          continue
        }
      }
    }
    
    slots.push({
      start: formatTimeFromMinutes(current),
      end: formatTimeFromMinutes(slotEnd)
    })
    
    current += stepMinutes
  }
  
  return slots
}

// Проверяет, занят ли слот
function isSlotOccupied(slot: TimeSlot, occupiedSlots: TimeSlot[]): boolean {
  const slotStart = parseTime(slot.start)
  const slotEnd = parseTime(slot.end)
  
  return occupiedSlots.some(occupied => {
    const occupiedStart = parseTime(occupied.start)
    const occupiedEnd = parseTime(occupied.end)
    
    // Проверяем пересечение слотов
    return (slotStart < occupiedEnd && slotEnd > occupiedStart)
  })
}

// Парсит время в формате HH:mm в минуты от начала дня
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Форматирует минуты от начала дня в формат HH:mm
function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Форматирует Date в формат HH:mm
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5)
}