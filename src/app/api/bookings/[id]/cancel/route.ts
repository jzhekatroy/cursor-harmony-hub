import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'

// PUT - отменить бронирование
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const resolvedParams = await params
    const bookingId = resolvedParams.id

    // Находим бронирование
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        master: true,
        services: {
          include: { service: true }
        }
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 })
    }

    // Проверяем что бронирование принадлежит команде пользователя
    if (booking.teamId !== user.teamId) {
      return NextResponse.json({ error: 'Нет прав для отмены этого бронирования' }, { status: 403 })
    }

    // Проверяем что бронирование еще можно отменить
    if (booking.status === BookingStatus.CANCELLED_BY_STAFF || booking.status === BookingStatus.CANCELLED_BY_CLIENT) {
      return NextResponse.json({ error: 'Бронирование уже отменено' }, { status: 400 })
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return NextResponse.json({ error: 'Нельзя отменить завершенное бронирование' }, { status: 400 })
    }

    // Отменяем бронирование в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем статус бронирования
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED_BY_STAFF,
          updatedAt: new Date()
        },
        include: {
          client: true,
          master: true,
          services: {
            include: { service: true }
          }
        }
      })

      // Создаем лог
      await tx.bookingLog.create({
        data: {
          bookingId: bookingId,
          action: 'CANCELLED',
          description: `Бронирование отменено администратором: ${user.firstName} ${user.lastName}`,
          teamId: user.teamId,
          userId: user.id
        }
      })

      return updatedBooking
    })

    return NextResponse.json({
      success: true,
      message: 'Бронирование успешно отменено',
      booking: {
        id: result.id,
        bookingNumber: result.bookingNumber,
        status: result.status,
        startTime: result.startTime,
        endTime: result.endTime,
        client: {
          firstName: result.client.firstName,
          lastName: result.client.lastName,
          email: result.client.email
        },
        master: {
          firstName: result.master.firstName,
          lastName: result.master.lastName
        },
        services: result.services.map(bs => ({
          name: bs.service.name,
          duration: bs.service.duration,
          price: bs.price
        }))
      }
    })

  } catch (error) {
    console.error('Cancel booking error:', error)
    return NextResponse.json(
      { error: 'Ошибка отмены бронирования' },
      { status: 500 }
    )
  }
}