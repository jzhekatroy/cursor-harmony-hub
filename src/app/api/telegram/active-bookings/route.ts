import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const teamSlug = searchParams.get('teamSlug')

    if (!telegramId || !teamSlug) {
      return NextResponse.json(
        { error: 'telegramId and teamSlug are required' },
        { status: 400 }
      )
    }

    // Находим команду по slug
    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { slug: teamSlug },
          { bookingSlug: teamSlug }
        ]
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Ищем клиента по telegramId в этой команде
    const client = await prisma.client.findFirst({
      where: {
        telegramId: BigInt(parseInt(telegramId)),
        teamId: team.id
      }
    })

    if (!client) {
      return NextResponse.json({ activeBookings: [] })
    }

    // Находим активные записи клиента
    const activeBookings = await prisma.booking.findMany({
      where: {
        clientId: client.id,
        teamId: team.id,
        status: {
          in: ['NEW', 'CONFIRMED'] // Активные статусы
        },
        startTime: {
          gte: new Date() // Только будущие записи
        }
      },
      include: {
        master: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    // Форматируем данные для ответа
    const formattedBookings = activeBookings.map(booking => ({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: booking.totalPrice,
      status: booking.status,
      master: {
        id: booking.master.id,
        name: `${booking.master.firstName} ${booking.master.lastName}`.trim()
      },
      services: booking.services.map(bs => ({
        id: bs.service.id,
        name: bs.service.name,
        price: bs.price
      }))
    }))

    return NextResponse.json({ activeBookings: formattedBookings })
  } catch (error) {
    console.error('Error fetching active bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
