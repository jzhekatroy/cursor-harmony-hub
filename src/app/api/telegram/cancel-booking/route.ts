import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { bookingId, telegramId, teamSlug } = await request.json()

    if (!bookingId || !telegramId || !teamSlug) {
      return NextResponse.json(
        { error: 'bookingId, telegramId and teamSlug are required' },
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
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Проверяем, что запись принадлежит этому клиенту
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        clientId: client.id,
        teamId: team.id,
        status: {
          in: ['NEW', 'CONFIRMED'] // Можно отменять только активные записи
        }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or cannot be cancelled' },
        { status: 404 }
      )
    }

    // Отменяем запись
    const updatedBooking = await prisma.booking.update({
      where: {
        id: bookingId
      },
      data: {
        status: 'CANCELLED_BY_CLIENT',
        updatedAt: new Date()
      }
    })

    // Создаем лог отмены
    await prisma.bookingLog.create({
      data: {
        action: 'CANCELLED_BY_CLIENT',
        description: 'Запись отменена клиентом через WebApp',
        bookingId: bookingId,
        teamId: team.id
      }
    })

    return NextResponse.json({ 
      success: true, 
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status
      }
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
