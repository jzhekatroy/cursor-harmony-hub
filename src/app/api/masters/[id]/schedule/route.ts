import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyToken } from '@/lib/auth'

interface ScheduleItem {
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
}

// GET /api/masters/[id]/schedule - получить расписание мастера
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Проверяем права доступа (только админы)
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав доступа' }, { status: 403 })
    }

    // Проверяем, что мастер принадлежит команде
    const master = await prisma.master.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!master) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
    }

    // Получаем расписание мастера
    const schedules = await prisma.masterSchedule.findMany({
      where: {
        masterId: id
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    })

    return NextResponse.json({ schedules })

  } catch (error) {
    console.error('Schedule get error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// PUT /api/masters/[id]/schedule - обновить расписание мастера
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    }

    // Проверяем права доступа (только админы)
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав доступа' }, { status: 403 })
    }

    const body = await request.json()
    const { schedules } = body

    console.log('Schedule update request:', { masterId: id, schedulesCount: schedules?.length })

    // Валидация
    if (!Array.isArray(schedules)) {
      return NextResponse.json({ error: 'schedules должен быть массивом' }, { status: 400 })
    }

    // Проверяем, что мастер принадлежит команде
    const master = await prisma.master.findFirst({
      where: {
        id,
        teamId: decoded.teamId
      }
    })

    if (!master) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
    }

    // Валидация данных расписания
    for (const schedule of schedules) {
      if (typeof schedule.dayOfWeek !== 'number' || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        return NextResponse.json({ error: 'dayOfWeek должен быть числом от 0 до 6' }, { status: 400 })
      }
      
      if (!schedule.startTime || !schedule.endTime) {
        return NextResponse.json({ error: 'startTime и endTime обязательны' }, { status: 400 })
      }

      // Проверяем формат времени (HH:mm)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
        return NextResponse.json({ error: 'Неверный формат времени. Используйте HH:mm' }, { status: 400 })
      }

      // Проверяем формат времени перерыва если указан
      if (schedule.breakStart && !timeRegex.test(schedule.breakStart)) {
        return NextResponse.json({ error: 'Неверный формат времени перерыва. Используйте HH:mm' }, { status: 400 })
      }
      if (schedule.breakEnd && !timeRegex.test(schedule.breakEnd)) {
        return NextResponse.json({ error: 'Неверный формат времени перерыва. Используйте HH:mm' }, { status: 400 })
      }

      // Проверяем логику времени
      const start = new Date(`2000-01-01T${schedule.startTime}:00`)
      const end = new Date(`2000-01-01T${schedule.endTime}:00`)
      if (start >= end) {
        return NextResponse.json({ error: 'Время начала должно быть раньше времени окончания' }, { status: 400 })
      }

      // Проверяем логику перерыва
      if (schedule.breakStart && schedule.breakEnd) {
        const breakStart = new Date(`2000-01-01T${schedule.breakStart}:00`)
        const breakEnd = new Date(`2000-01-01T${schedule.breakEnd}:00`)
        
        if (breakStart >= breakEnd) {
          return NextResponse.json({ error: 'Время начала перерыва должно быть раньше времени окончания перерыва' }, { status: 400 })
        }
        
        if (breakStart < start || breakEnd > end) {
          return NextResponse.json({ error: 'Перерыв должен быть в пределах рабочего времени' }, { status: 400 })
        }
      }
    }

    // Обновляем расписание в транзакции
    const result = await prisma.$transaction(async (tx: any) => {
      // Удаляем существующее расписание
      await tx.masterSchedule.deleteMany({
        where: {
          masterId: id
        }
      })

      // Создаем новое расписание
      const newSchedules = await Promise.all(
        schedules.map((schedule: ScheduleItem) =>
          tx.masterSchedule.create({
            data: {
              masterId: id,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              breakStart: schedule.breakStart || null,
              breakEnd: schedule.breakEnd || null
            }
          })
        )
      )

      return newSchedules
    })

    return NextResponse.json({ 
      success: true, 
      schedules: result 
    })

  } catch (error) {
    console.error('Schedule update error:', error)
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}