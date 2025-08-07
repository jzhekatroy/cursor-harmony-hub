import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const masterId = searchParams.get('masterId')
  const date = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') || '60')

  if (!masterId || !date) {
    return NextResponse.json({ error: 'masterId и date обязательны' }, { status: 400 })
  }

  try {
    // Получаем мастера с бронированиями
    const master = await prisma.master.findUnique({
      where: { id: masterId },
      include: {
        team: true,
        schedules: true,
        bookings: {
          where: {
            OR: [
              // Московское время
              {
                startTime: {
                  gte: new Date(`${date}T00:00:00+03:00`),
                  lt: new Date(`${date}T23:59:59+03:00`)
                }
              },
              // UTC время на всякий случай
              {
                startTime: {
                  gte: new Date(`${date}T00:00:00.000Z`),
                  lt: new Date(`${date}T23:59:59.999Z`)
                }
              }
            ],
            status: {
              in: [BookingStatus.NEW, BookingStatus.CONFIRMED, BookingStatus.COMPLETED]
            }
          }
        }
      }
    })

    if (!master) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
    }

    // Функция форматирования времени из Date
    function formatTime(date: Date): string {
      return date.toTimeString().slice(0, 5)
    }

    // Получаем текущее время в московском часовом поясе
    const now = new Date()
    const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000))
    
      const currentHour = moscowTime.getUTCHours()
  const currentMinute = moscowTime.getUTCMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute
    const currentDateStr = moscowTime.toISOString().split('T')[0]
    const isToday = date === currentDateStr

    // Получаем расписание на день недели
    const requestDate = new Date(date)
    const dayOfWeek = requestDate.getDay()
    const daySchedule = master.schedules.find(s => s.dayOfWeek === dayOfWeek)

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      input: {
        masterId,
        masterName: `${master.firstName} ${master.lastName}`,
        date,
        duration
      },
      timeInfo: {
        utcTime: now.toISOString(),
        moscowTime: moscowTime.toISOString(),
        currentTimeMinutes,
        currentDateStr,
        isToday,
        requestedDayOfWeek: dayOfWeek
      },
      schedule: daySchedule ? {
        exists: true,
        startTime: daySchedule.startTime,
        endTime: daySchedule.endTime,
        breakStart: daySchedule.breakStart,
        breakEnd: daySchedule.breakEnd
      } : {
        exists: false,
        reason: 'Мастер не работает в этот день недели'
      },
      bookings: master.bookings.map(booking => ({
        id: booking.id,
        startTime: formatTime(booking.startTime),
        endTime: formatTime(booking.endTime),
        status: booking.status,
        startTimeRaw: booking.startTime.toISOString(),
        endTimeRaw: booking.endTime.toISOString()
      })),
      settings: {
        bookingStep: master.team.bookingStep
      }
    }

    // Если есть расписание, генерируем слоты
    if (daySchedule) {
      const slots = generateDebugSlots(
        daySchedule.startTime,
        daySchedule.endTime,
        daySchedule.breakStart,
        daySchedule.breakEnd,
        master.team.bookingStep,
        duration,
        currentTimeMinutes,
        isToday,
        master.bookings
      )
      
      debugInfo.slots = slots
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('Ошибка debug API:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
}

function generateDebugSlots(
  startTime: string,
  endTime: string,
  breakStart: string | null,
  breakEnd: string | null,
  stepMinutes: number,
  serviceDuration: number,
  currentTimeMinutes: number,
  isToday: boolean,
  bookings: any[]
) {
  const slots = []
  
  // Функции для работы с временем
  function parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  function formatTimeFromDate(date: Date): string {
    // Конвертируем UTC в московское время (UTC+3)
    const moscowOffset = 3 * 60 // 3 часа в минутах
    const utcTime = date.getTime()
    const moscowTime = new Date(utcTime + (moscowOffset * 60 * 1000))
    
    const hours = moscowTime.getUTCHours()
    const minutes = moscowTime.getUTCMinutes()
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const start = parseTime(startTime)
  const end = parseTime(endTime)
  const breakStartTime = breakStart ? parseTime(breakStart) : null
  const breakEndTime = breakEnd ? parseTime(breakEnd) : null

  // Занятые слоты
  const occupiedSlots = bookings.map(booking => ({
    start: formatTimeFromDate(booking.startTime),
    end: formatTimeFromDate(booking.endTime),
    startMinutes: parseTime(formatTimeFromDate(booking.startTime)),
    endMinutes: parseTime(formatTimeFromDate(booking.endTime))
  }))

  let current = start
  
  while (current + serviceDuration <= end) {
    const slotEnd = current + serviceDuration
    const timeStr = formatTime(current)
    
    let status = 'available'
    let reason = ''

    // Проверка перерыва
    if (breakStartTime && breakEndTime) {
      if (current < breakEndTime && slotEnd > breakStartTime) {
        status = 'blocked'
        reason = 'перерыв'
      }
    }

    // Проверка прошедшего времени
    if (status === 'available' && isToday && current <= currentTimeMinutes + 15) {
      status = 'blocked'
      reason = `прошедшее время (текущее: ${formatTime(currentTimeMinutes)}, слот: ${timeStr})`
    }

    // Проверка занятых слотов
    if (status === 'available') {
      for (const occupied of occupiedSlots) {
        if (current < occupied.endMinutes && slotEnd > occupied.startMinutes) {
          status = 'blocked'
          reason = `занято (пересечение с ${occupied.start}-${occupied.end})`
          break
        }
      }
    }

    slots.push({
      start: timeStr,
      end: formatTime(slotEnd),
      startMinutes: current,
      endMinutes: slotEnd,
      status,
      reason
    })

    current += stepMinutes
  }

  return {
    total: slots.length,
    available: slots.filter(s => s.status === 'available').length,
    blocked: slots.filter(s => s.status === 'blocked').length,
    slots: slots
  }
}