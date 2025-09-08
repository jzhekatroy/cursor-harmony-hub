import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

    // Получаем бронирование
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Получаем все логи, связанные с этой бронью
    const logs = await prisma.telegramLog.findMany({
      where: {
        OR: [
          // Логи по clientId
          { clientId: booking.clientId },
          // Логи по teamId
          { teamId: booking.teamId },
          // Логи по URL (если содержит bookingId)
          { url: { contains: bookingId } },
          // Логи по данным (если содержит bookingId)
          { data: { path: ['bookingId'], equals: bookingId } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Ограничиваем количество логов
    })

    // Получаем также логи создания записей (если есть)
    const bookingLogs = await prisma.clientAction.findMany({
      where: {
        clientId: booking.clientId,
        actionType: 'BOOKING_CREATED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Получаем все действия клиента
    const clientActions = await prisma.clientAction.findMany({
      where: {
        clientId: booking.clientId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json({
      booking: {
        ...booking,
        client: booking.client ? {
          ...booking.client,
          telegramId: booking.client.telegramId?.toString() || null
        } : null
      },
      logs: logs.map(log => ({
        ...log,
        data: typeof log.data === 'object' ? log.data : JSON.parse(log.data || '{}')
      })),
      bookingLogs,
      clientActions,
      totalLogs: logs.length,
      totalActions: clientActions.length
    })

  } catch (error) {
    console.error('Error fetching booking logs:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
