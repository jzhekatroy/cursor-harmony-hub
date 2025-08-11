import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { utcToSalonTime, salonTimeToUtc } from '@/lib/timezone'

// Обновление бронирования
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const bookingId = id
    const body = await request.json()
    const { startTime, masterId, totalPrice, notes } = body

    // Находим бронирование
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        services: { include: { service: true } },
        master: true,
        team: true
      }
    })

    if (!existingBooking) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 })
    }

    if (existingBooking.teamId !== user.teamId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Проверяем, можно ли редактировать
    if (existingBooking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Завершенное бронирование нельзя редактировать' }, { status: 400 })
    }

    // Подготавливаем данные для обновления
    const updateData: any = {}

    // Обновление времени
    if (startTime) {
      const newStartTime = new Date(startTime)
      if (isNaN(newStartTime.getTime())) {
        return NextResponse.json({ error: 'Некорректное время начала' }, { status: 400 })
      }

      // Конвертируем время из салона в UTC для сохранения в БД
      const salonTimezone = user.team.timezone || 'Europe/Moscow'
      const utcStartTime = salonTimeToUtc(newStartTime, salonTimezone)
      
      // Вычисляем новое время окончания на основе услуг
      const totalDuration = existingBooking.services.reduce((sum, bs) => sum + bs.service.duration, 0)
      const utcEndTime = new Date(utcStartTime.getTime() + totalDuration * 60 * 1000)

      // Проверяем конфликты с другими бронированиями (исключая текущее)
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          id: { not: bookingId },
          masterId: masterId || existingBooking.masterId,
          status: { in: ['NEW', 'CONFIRMED'] },
          OR: [
            {
              startTime: { lte: utcStartTime },
              endTime: { gt: utcStartTime }
            },
            {
              startTime: { lt: utcEndTime },
              endTime: { gte: utcEndTime }
            },
            {
              startTime: { gte: utcStartTime },
              endTime: { lte: utcEndTime }
            }
          ]
        }
      })

      if (conflictingBooking) {
        return NextResponse.json({ error: 'Выбранное время уже занято' }, { status: 409 })
      }

      updateData.startTime = utcStartTime
      updateData.endTime = utcEndTime
    }

    // Обновление мастера
    if (masterId && masterId !== existingBooking.masterId) {
      // Проверяем, что мастер существует и активен
      const master = await prisma.master.findFirst({
        where: {
          id: masterId,
          teamId: user.teamId,
          isActive: true
        }
      })

      if (!master) {
        return NextResponse.json({ error: 'Мастер не найден или неактивен' }, { status: 404 })
      }

      // Если меняется время, проверяем конфликты для нового мастера
      if (startTime) {
        const newStartTime = new Date(startTime)
        const totalDuration = existingBooking.services.reduce((sum, bs) => sum + bs.service.duration, 0)
        
        // Конвертируем время из салона в UTC для проверки
        const salonTimezone = user.team.timezone || 'Europe/Moscow'
        const utcStartTime = salonTimeToUtc(newStartTime, salonTimezone)
        const utcEndTime = new Date(utcStartTime.getTime() + totalDuration * 60 * 1000)

        const conflictingBooking = await prisma.booking.findFirst({
          where: {
            id: { not: bookingId },
            masterId: masterId,
            status: { in: ['NEW', 'CONFIRMED'] },
            OR: [
              {
                startTime: { lte: utcStartTime },
                endTime: { gt: utcStartTime }
              },
              {
                startTime: { lt: utcEndTime },
                endTime: { gte: utcEndTime }
              },
              {
                startTime: { gte: utcStartTime },
                endTime: { lte: utcEndTime }
              }
            ]
          }
        })

        if (conflictingBooking) {
          return NextResponse.json({ error: 'Выбранное время уже занято у нового мастера' }, { status: 409 })
        }
      }

      updateData.masterId = masterId
    }

    // Обновление цены
    if (totalPrice !== undefined && totalPrice !== existingBooking.totalPrice) {
      if (totalPrice < 0) {
        return NextResponse.json({ error: 'Цена не может быть отрицательной' }, { status: 400 })
      }
      updateData.totalPrice = totalPrice
    }

    // Обновление комментариев
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Если есть изменения, обновляем бронирование
    if (Object.keys(updateData).length > 0) {
      const updatedBooking = await prisma.$transaction(async (tx) => {
        // Обновляем бронирование
        const booking = await tx.booking.update({
          where: { id: bookingId },
          data: updateData,
          include: {
            client: true,
            master: true,
            services: {
              include: { service: true }
            }
          }
        })

        // Создаем лог изменений
        const changes = []
        if (startTime) changes.push('время')
        if (masterId && masterId !== existingBooking.masterId) changes.push('мастер')
        if (totalPrice !== undefined && totalPrice !== existingBooking.totalPrice) changes.push('цена')
        if (notes !== undefined) changes.push('комментарий')

        await tx.bookingLog.create({
          data: {
            bookingId: bookingId,
            action: 'UPDATED',
            description: `Бронирование обновлено: ${changes.join(', ')}`,
            teamId: user.teamId,
            userId: user.id
          }
        })

        return booking
      })

      return NextResponse.json({
        success: true,
        booking: updatedBooking
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Нет изменений для обновления'
    })

  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Получение информации о бронировании
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Проверяем авторизацию
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const bookingId = id

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        master: true,
        services: {
          include: { service: true }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 })
    }

    if (booking.teamId !== user.teamId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Конвертируем время из UTC в время салона
    const salonTimezone = user.team.timezone || 'Europe/Moscow'
    const convertedBooking = {
      ...booking,
      startTime: utcToSalonTime(booking.startTime, salonTimezone).toISOString(),
      endTime: utcToSalonTime(booking.endTime, salonTimezone).toISOString()
    }

    return NextResponse.json({ booking: convertedBooking })

  } catch (error) {
    console.error('Get booking error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
