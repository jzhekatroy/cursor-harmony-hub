import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем все бронирования с клиентами и командами
    const bookings = await prisma.booking.findMany({
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            telegramId: true,
            telegramUsername: true,
            source: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        startTime: 'desc' // Сначала самые новые
      },
      take: 100 // Ограничиваем количество для производительности
    })

    // Преобразуем BigInt в строки для JSON сериализации
    const serializedBookings = bookings.map(booking => ({
      ...booking,
      client: booking.client ? {
        ...booking.client,
        telegramId: booking.client.telegramId?.toString() || null
      } : null
    }))

    return NextResponse.json({
      bookings: serializedBookings,
      total: bookings.length
    })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
