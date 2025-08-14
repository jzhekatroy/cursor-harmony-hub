import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 })
    }

    if (booking.teamId !== user.teamId) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Разрешаем NO_SHOW только для завершившихся записей
    if (booking.endTime > new Date()) {
      return NextResponse.json({ error: 'Отметить как «Не пришёл» можно только завершившиеся записи' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.NO_SHOW }
      })

      await tx.bookingLog.create({
        data: {
          bookingId: id,
          action: 'NO_SHOW',
          description: 'Клиент не пришёл',
          teamId: user.teamId,
          userId: user.id
        }
      })

      // Событие клиента
      await (tx as any).clientEvent.create({
        data: {
          teamId: user.teamId,
          // найдём clientId быстро
          clientId: (await tx.booking.findUnique({ where: { id }, select: { clientId: true } }))?.clientId || null,
          source: 'admin',
          type: 'booking_no_show',
          metadata: { bookingId: id },
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error mark no-show:', error)
    return NextResponse.json({ error: 'Ошибка изменения статуса' }, { status: 500 })
  }
}


