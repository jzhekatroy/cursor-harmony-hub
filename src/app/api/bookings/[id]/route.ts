import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@/lib/enums'
import jwt from 'jsonwebtoken'
import { utcToSalonTime, salonTimeToUtc, createDateInSalonTimezone } from '@/lib/timezone'

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
    const { startTime, masterId, totalPrice, notes, duration, serviceId, status, clientId, clientData } = body

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

    // Разрешаем редактирование завершённых бронирований по требованиям

    // Подготавливаем данные для обновления
    const updateData: any = {}

    // Обновление времени и/или длительности
    if (startTime || duration) {
      const salonTimezone = user.team.timezone || 'Europe/Moscow'
      let utcStartTime: Date
      if (startTime) {
        // Парсим локальную строку datetime-local как время салона
        const [datePart, timePart] = String(startTime).split('T')
        const [y, m, d] = datePart.split('-').map(Number)
        const [hh, mm] = timePart.split(':').map(Number)
        if (!y || !m || !d || isNaN(hh) || isNaN(mm)) {
          return NextResponse.json({ error: 'Некорректное время начала' }, { status: 400 })
        }
        utcStartTime = createDateInSalonTimezone(y, m, d, hh, mm, salonTimezone)
      } else {
        // Если меняем только длительность — старт берем из текущего значения
        utcStartTime = new Date(existingBooking.startTime)
      }

      // Длительность: либо из запроса, либо суммой услуг
      const totalDuration = Number(duration) > 0
        ? Number(duration)
        : existingBooking.services.reduce((sum, bs) => sum + bs.service.duration, 0)
      const utcEndTime = new Date(utcStartTime.getTime() + totalDuration * 60 * 1000)

      // Не блокируем сохранение при конфликтах: предупреждение отображается на фронтенде

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

      // Не блокируем сохранение при конфликтах у нового мастера

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

    // Смена клиента: либо по clientId (существующий), либо по clientData (создать/найти)
    let changedClient = false
    if (clientId) {
      // Проверяем, что клиент принадлежит команде
      const targetClient = await prisma.client.findFirst({ where: { id: clientId, teamId: user.teamId } })
      if (!targetClient) {
        return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
      }
      if (existingBooking.clientId !== clientId) {
        updateData.clientId = clientId
        changedClient = true
      }
    } else if (clientData && typeof clientData === 'object') {
      const name: string = String(clientData.name || '').trim()
      const emailTrim: string = String(clientData.email || '').trim()
      const phoneRaw: string = String(clientData.phone || '')
      // Требуем имя и телефон для нового клиента
      const { createDateInSalonTimezone } = await import('@/lib/timezone')
      const { toE164 } = await import('@/lib/phone')
      const { e164: phoneE164 } = toE164(phoneRaw, (user.team as any).countryCode || 'RU')
      if (!name) {
        return NextResponse.json({ error: 'Укажите имя клиента' }, { status: 400 })
      }
      if (!phoneE164) {
        return NextResponse.json({ error: 'Укажите корректный телефон клиента' }, { status: 400 })
      }
      // Поиск существующего по email/телефону
      let target = null as any
      if (emailTrim) {
        target = await prisma.client.findFirst({ where: { email: emailTrim, teamId: user.teamId } })
      }
      if (!target) {
        target = await prisma.client.findFirst({ where: { phone: phoneE164, teamId: user.teamId } })
      }
      const [firstName, ...rest] = name.split(/\s+/)
      const lastName = rest.join(' ') || null
      if (!target) {
        // Создаём нового клиента
        const emailForCreate = emailTrim || `${String(phoneE164).replace('+','')}${String(user.teamId).slice(0,6)}@noemail.local`
        try {
          target = await prisma.client.create({
            data: {
              email: emailForCreate,
              phone: phoneE164,
              firstName,
              lastName,
              teamId: user.teamId
            }
          })
        } catch (err: any) {
          if (err && err.code === 'P2002') {
            target = await prisma.client.findFirst({ where: { email: emailForCreate, teamId: user.teamId } })
          } else {
            throw err
          }
        }
      } else {
        // Обновляем недостающие поля
        const needUpdate = (!target.firstName && firstName) || (!target.lastName && lastName) || (phoneE164 && target.phone !== phoneE164)
        if (needUpdate) {
          target = await prisma.client.update({ where: { id: target.id }, data: {
            firstName: target.firstName || firstName,
            lastName: target.lastName || lastName,
            phone: phoneE164 || target.phone
          } })
        }
      }
      if (target && existingBooking.clientId !== target.id) {
        updateData.clientId = target.id
        changedClient = true
      }
    }

    // Валидируем смену статуса: правила переходов
    if (status && status !== existingBooking.status) {
      const cur = existingBooking.status
      const next = status as BookingStatus
      if (cur === BookingStatus.NEW || cur === BookingStatus.CONFIRMED) {
        const isAllowed = (next === BookingStatus.CANCELLED_BY_CLIENT) || (next === BookingStatus.CANCELLED_BY_SALON)
        if (!isAllowed) {
          return NextResponse.json({ error: 'Из статусов «Создана» и «Подтверждена» можно перейти только в «Отменена клиентом» или «Отменена салоном»' }, { status: 400 })
        }
      }
      updateData.status = next
    }

    // Если есть изменения или смена услуги, обновляем бронирование
    if (Object.keys(updateData).length > 0 || serviceId) {
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

        // Смена услуги (перезаписываем состав услуг как одиночную услугу)
        if (serviceId) {
          // Проверяем, что услуга принадлежит команде
          const service = await tx.service.findFirst({ where: { id: serviceId, teamId: user.teamId } })
          if (!service) {
            throw new Error('Услуга не найдена')
          }
          // Удаляем старые связи
          await tx.bookingService.deleteMany({ where: { bookingId } })
          // Добавляем новую связь
          await tx.bookingService.create({
            data: {
              bookingId,
              serviceId,
              price: service.price
            }
          })
          // Если не переданы duration/totalPrice — подставляем из услуги
          const mustUpdate: any = {}
          if (duration === undefined || Number(duration) <= 0) {
            // Пересчёт времени по длительности услуги
            const utcStart = new Date((booking as any).startTime)
            const utcEnd = new Date(utcStart.getTime() + Number(service.duration) * 60 * 1000)
            mustUpdate.endTime = utcEnd
          }
          if (totalPrice === undefined) {
            mustUpdate.totalPrice = service.price
          }
          if (Object.keys(mustUpdate).length > 0) {
            await tx.booking.update({ where: { id: bookingId }, data: mustUpdate })
          }
        }

        // Создаем лог изменений
        const changes = [] as string[]
        if (startTime) changes.push('время')
        if (masterId && masterId !== existingBooking.masterId) changes.push('мастер')
        if (totalPrice !== undefined && totalPrice !== existingBooking.totalPrice) changes.push('цена')
        if (serviceId) changes.push('услуга')
        if (status && status !== existingBooking.status) changes.push('статус')
        if (notes !== undefined) changes.push('комментарий')
        if (changedClient) changes.push('клиент')

        await tx.bookingLog.create({
          data: {
            bookingId: bookingId,
            action: 'UPDATED',
            description: `Бронирование обновлено: ${changes.join(', ')}`,
            teamId: user.teamId,
            userId: user.id
          }
        })

        // Обновляем lastActivity клиента
        if (booking.clientId) {
          await tx.client.update({
            where: { id: booking.clientId },
            data: { lastActivity: new Date() }
          })
        }

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
