import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateBookingNumber } from '@/lib/auth'
import { BookingStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { utcToSalonTime, createDateInSalonTimezone } from '@/lib/timezone'
import { toE164 } from '@/lib/phone'

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
    console.log('🔍 DEBUG startTime (salon string):', startTime)
    // Парсим строку времени как время САЛОНА, а не локальное время сервера
    const [datePart, timePart] = startTime.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    
    if (!year || !month || !day || isNaN(hour) || isNaN(minute)) {
      return NextResponse.json(
        { error: `Некорректное время: ${startTime}` },
        { status: 400 }
      )
    }
    
    // Создаем UTC-время из локального времени салона для сохранения в БД
    const salonTimezone = team.timezone || 'Europe/Moscow'
    const utcStartDateTime = createDateInSalonTimezone(year, month, day, hour, minute, salonTimezone)
    const utcEndDateTime = new Date(utcStartDateTime.getTime() + totalDuration * 60 * 1000)
    
    console.log('🔍 DEBUG utcStartDateTime:', utcStartDateTime)
    console.log('🔍 DEBUG utcEndDateTime:', utcEndDateTime)

    // Проверяем конфликты с существующими бронированиями
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        masterId: masterId,
        status: { in: ['NEW', 'CONFIRMED'] },
        OR: [
          {
            startTime: { lte: utcStartDateTime },
            endTime: { gt: utcStartDateTime }
          },
          {
            startTime: { lt: utcEndDateTime },
            endTime: { gte: utcEndDateTime }
          },
          {
            startTime: { gte: utcStartDateTime },
            endTime: { lte: utcEndDateTime }
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

    // Создаем или находим клиента (MVP: по email/телефону + имя из name)
    const fullName: string = (clientData.name || '').trim()
    let parsedFirstName: string | null = null
    let parsedLastName: string | null = null
    if (fullName) {
      const parts = fullName.split(/\s+/)
      parsedFirstName = parts[0] || null
      parsedLastName = parts.slice(1).join(' ') || null
    }

    // Нормализуем телефон в E.164
    const { e164: phoneE164 } = toE164(clientData.phone || '', (team as any).countryCode || 'RU')

    // Если нового клиента не находим по email/телефону, потребуем имя и телефон
    const emailTrim = (clientData.email || '').trim()

    let client = null as null | (typeof prisma.client extends { findFirst: any } ? any : never)
    if (clientData.email) {
      client = await prisma.client.findFirst({
        where: { email: clientData.email, teamId: team.id }
      })
    }
    if (!client && phoneE164) {
      client = await prisma.client.findFirst({
        where: { phone: phoneE164, teamId: team.id }
      })
    }

    if (!client) {
      if (!fullName) {
        return NextResponse.json({ error: 'Укажите имя клиента' }, { status: 400 })
      }
      if (!phoneE164) {
        return NextResponse.json({ error: 'Укажите корректный телефон клиента' }, { status: 400 })
      }
      const emailForCreate = emailTrim || `${String(phoneE164).replace('+','')}${String(team.id).slice(0,6)}@noemail.local`
      // Пытаемся создать клиента, если он не найден. На случай гонки (P2002) — перезапрашиваем существующего
      try {
        client = await prisma.client.create({
          data: {
            email: emailForCreate,
            phone: phoneE164,
            telegram: clientData.telegram,
            firstName: clientData.firstName ?? parsedFirstName,
            lastName: clientData.lastName ?? parsedLastName,
            address: clientData.address,
            teamId: team.id
          }
        })
      } catch (err: any) {
        // Если уникальный индекс email+teamId сработал — значит клиент уже есть. Пробуем найти по email/телефону
        if (err && err.code === 'P2002') {
          let existing = null as any
          existing = await prisma.client.findFirst({ where: { email: emailTrim, teamId: team.id } })
          if (!existing && phoneE164) {
            existing = await prisma.client.findFirst({ where: { phone: phoneE164, teamId: team.id } })
          }
          if (existing) {
            client = existing
          } else {
            throw err
          }
        } else {
          throw err
        }
      }
    } else if (((!client.firstName && parsedFirstName) || (!client.lastName && parsedLastName)) || (phoneE164 && client.phone !== phoneE164)) {
      // Обновляем отсутствующие ФИО, если пришло имя от клиента
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          firstName: client.firstName || parsedFirstName,
          lastName: client.lastName || parsedLastName,
          phone: phoneE164 || client.phone
        }
      })
    }

    // Лимит записей на клиента/день (по времени салона)
    // SQLite типы у Prisma могут не подтянуть добавленное поле в типе, используем any для безопасного доступа
    const limit = (team as any).maxBookingsPerDayPerClient ?? 3
    const dayStartUtc = createDateInSalonTimezone(year, month, day, 0, 0, team.timezone || 'Europe/Moscow')
    const dayEndUtc = createDateInSalonTimezone(year, month, day, 23, 59, team.timezone || 'Europe/Moscow')
    const existingCount = await prisma.booking.count({
      where: {
        teamId: team.id,
        clientId: client.id,
        status: { in: ['NEW', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
        startTime: { gte: dayStartUtc, lte: dayEndUtc }
      }
    })
    if (existingCount >= limit) {
      return NextResponse.json(
        { error: `Лимит записей на день: ${limit}. У клиента уже ${existingCount} записей в этот день.` },
        { status: 429 }
      )
    }

    // Проверяем, есть ли услуги, требующие подтверждения
    const hasServicesRequiringConfirmation = services.some(service => service.requireConfirmation)

    // Создаем бронирование в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем бронирование
      const booking = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          startTime: utcStartDateTime,
          endTime: utcEndDateTime,
          totalPrice: totalPrice,
          notes: clientData.notes,
          status: hasServicesRequiringConfirmation ? BookingStatus.NEW : BookingStatus.CONFIRMED,
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
          action: hasServicesRequiringConfirmation ? 'NEW' : 'CONFIRMED',
          description: hasServicesRequiringConfirmation 
            ? 'Бронирование создано клиентом через виджет записи (требует подтверждения)'
            : 'Бронирование создано клиентом через виджет записи (автоматически подтверждено)',
          teamId: team.id
        }
      })

      // Событие клиента (аналитика)
      await (tx as any).clientEvent.create({
        data: {
          teamId: team.id,
          clientId: client.id,
          source: 'public',
          type: 'booking_created',
          metadata: {
            bookingId: booking.id,
            masterId,
            serviceIds,
            timezone: (team as any).timezone || 'Europe/Moscow',
            // Город лучше определять на фронте (Geolocation API) или по IP на бэке через GeoIP, пока пишем tz
          },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null
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
    const clientId = searchParams.get('clientId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Используем teamId из авторизованного пользователя
    const teamId = user.teamId

    let whereClause: any = { teamId }

    // Автообновление: при каждом запросе списка, закрываем просроченные CONFIRMED как COMPLETED
    // Перевод просроченных CONFIRMED в COMPLETED + лог события клиента
    const outdated = await prisma.booking.findMany({
      where: { teamId, status: 'CONFIRMED', endTime: { lt: new Date() } },
      select: { id: true, clientId: true }
    })
    if (outdated.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.booking.updateMany({
          where: { teamId, status: 'CONFIRMED', endTime: { lt: new Date() } },
          data: { status: 'COMPLETED' }
        })
        for (const b of outdated) {
          await (tx as any).clientEvent.create({
            data: {
              teamId,
              clientId: b.clientId,
              source: 'system',
              type: 'booking_completed',
              metadata: { bookingId: b.id },
            }
          })
        }
      })
    }

    if (masterId) {
      whereClause.masterId = masterId
    }

    if (clientId) {
      whereClause.clientId = clientId
    }

    if (from || to) {
      const gte = from ? new Date(from) : undefined
      const lte = to ? new Date(to) : undefined
      whereClause.startTime = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) }
    } else if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      whereClause.startTime = { gte: startOfDay, lte: endOfDay }
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

    // Возвращаем время как есть (UTC). Клиент сам отображает в TZ салона
    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}