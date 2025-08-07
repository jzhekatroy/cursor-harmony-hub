import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBookingNumber } from '@/lib/auth'
import { BookingStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'

// Создание нового бронирования
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      teamSlug,
      serviceIds,
      masterId,
      startTime,
      clientData
    } = body

    // Валидация
    if (!teamSlug || !serviceIds || !masterId || !startTime || !clientData) {
      return NextResponse.json(
        { error: 'Не все обязательные поля заполнены' },
        { status: 400 }
      )
    }

    // Находим команду по slug
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' },
        { status: 404 }
      )
    }

    if (team.status === 'DISABLED') {
      return NextResponse.json(
        { error: 'Команда временно не принимает записи' },
        { status: 403 }
      )
    }

    // Проверяем мастера
    const master = await prisma.master.findFirst({
      where: {
        id: masterId,
        teamId: team.id,
        isActive: true
      }
    })

    if (!master) {
      return NextResponse.json(
        { error: 'Мастер не найден или неактивен' },
        { status: 404 }
      )
    }

    // Получаем услуги
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        teamId: team.id,
        isArchived: false
      }
    })

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: 'Некоторые услуги не найдены' },
        { status: 404 }
      )
    }

    // Вычисляем общую продолжительность и стоимость
    const totalDuration = services.reduce((sum, service) => sum + service.duration, 0)
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0)

    // Вычисляем время окончания
    const startDateTime = new Date(startTime)
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60 * 1000)

    // Проверяем конфликты с существующими бронированиями
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        masterId: masterId,
        status: { in: ['CREATED', 'CONFIRMED'] },
        OR: [
          {
            startTime: { lte: startDateTime },
            endTime: { gt: startDateTime }
          },
          {
            startTime: { lt: endDateTime },
            endTime: { gte: endDateTime }
          },
          {
            startTime: { gte: startDateTime },
            endTime: { lte: endDateTime }
          }
        ]
      }
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Выбранное время уже занято' },
        { status: 409 }
      )
    }

    // Создаем или находим клиента
    let client = await prisma.client.findFirst({
      where: {
        email: clientData.email,
        teamId: team.id
      }
    })

    if (!client) {
      client = await prisma.client.create({
        data: {
          email: clientData.email,
          phone: clientData.phone,
          telegram: clientData.telegram,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          address: clientData.address,
          teamId: team.id
        }
      })
    }

    // Создаем бронирование в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем бронирование
      const booking = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          startTime: startDateTime,
          endTime: endDateTime,
          totalPrice: totalPrice,
          notes: clientData.notes,
          status: team.requireConfirmation ? BookingStatus.NEW : BookingStatus.CONFIRMED,
          teamId: team.id,
          clientId: client.id,
          masterId: masterId
        }
      })

      // Связываем с услугами
      for (const service of services) {
        await tx.bookingService.create({
          data: {
            bookingId: booking.id,
            serviceId: service.id,
            price: service.price
          }
        })
      }

      // Создаем лог
      await tx.bookingLog.create({
        data: {
          bookingId: booking.id,
          action: team.requireConfirmation ? 'NEW' : 'CONFIRMED',
          description: team.requireConfirmation 
            ? 'Бронирование создано клиентом через виджет записи (требует подтверждения)'
            : 'Бронирование создано клиентом через виджет записи (автоматически подтверждено)',
          teamId: team.id
        }
      })

      return booking
    })

    // Получаем полную информацию о бронировании
    const fullBooking = await prisma.booking.findUnique({
      where: { id: result.id },
      include: {
        client: true,
        master: true,
        services: {
          include: { service: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: fullBooking!.id,
        bookingNumber: fullBooking!.bookingNumber,
        startTime: fullBooking!.startTime,
        endTime: fullBooking!.endTime,
        totalPrice: fullBooking!.totalPrice,
        status: fullBooking!.status,
        client: {
          firstName: fullBooking!.client.firstName,
          lastName: fullBooking!.client.lastName,
          email: fullBooking!.client.email
        },
        master: {
          firstName: fullBooking!.master.firstName,
          lastName: fullBooking!.master.lastName
        },
        services: fullBooking!.services.map(bs => ({
          name: bs.service.name,
          duration: bs.service.duration,
          price: bs.price
        }))
      }
    })

  } catch (error) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Получение бронирований команды
export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию для админки
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

    const { searchParams } = new URL(request.url)
    const masterId = searchParams.get('masterId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    // Используем teamId из авторизованного пользователя
    const teamId = user.teamId

    let whereClause: any = { teamId }

    if (masterId) {
      whereClause.masterId = masterId
    }

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.startTime = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    if (status) {
      whereClause.status = status
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        client: true,
        master: true,
        services: {
          include: { service: true }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}