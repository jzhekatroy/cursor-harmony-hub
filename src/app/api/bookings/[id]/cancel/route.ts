import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'

// Отмена бронирования администратором
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Авторизация
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

    // Находим бронирование
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 })
    }

    if (booking.teamId !== user.teamId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Прошедшие брони отменять нельзя — только отметка NO_SHOW
    if (booking.endTime <= new Date()) {
      return NextResponse.json({ error: 'Прошедшие записи нельзя отменить. Отметьте как «Не пришёл».' }, { status: 400 })
    }

    if (booking.status === 'CANCELLED_BY_SALON' || booking.status === 'CANCELLED_BY_CLIENT') {
      return NextResponse.json({ success: true, message: 'Бронирование уже отменено' })
    }

    // Отмена в транзакции + лог
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED_BY_SALON }
      })

      await tx.bookingLog.create({
        data: {
          bookingId: id,
          action: 'UPDATED',
          description: 'Бронирование отменено администратором',
          teamId: user.teamId,
          userId: user.id
        }
      })

      // Событие клиента
      await (tx as any).clientEvent.create({
        data: {
          teamId: user.teamId,
          clientId: updated.clientId,
          source: 'admin',
          type: 'booking_cancelled',
          metadata: { bookingId: updated.id, cancelledBy: 'salon' },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null
        }
      })

      // Обновляем lastActivity клиента
      if (updated.clientId) {
        await tx.client.update({
          where: { id: updated.clientId },
          data: { lastActivity: new Date() }
        })
      }

      return updated
    })

    return NextResponse.json({ success: true, booking: result })
  } catch (error) {
    console.error('Cancel booking error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}


