import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// API для получения информации о клиенте по Telegram ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const teamSlug = searchParams.get('teamSlug')

    if (!telegramId || !teamSlug) {
      return NextResponse.json({ 
        error: 'telegramId and teamSlug are required' 
      }, { status: 400 })
    }

    // Получаем информацию о салоне
    const team = await prisma.team.findFirst({
      where: { 
        OR: [
          { slug: teamSlug },
          { bookingSlug: teamSlug }
        ]
      },
      select: { id: true, name: true }
    })

    if (!team) {
      return NextResponse.json({ 
        error: 'Salon not found' 
      }, { status: 404 })
    }

    // Ищем клиента по Telegram ID
    const client = await prisma.client.findFirst({
      where: {
        telegramId: telegramId,
        teamId: team.id
      },
      include: {
        bookings: {
          orderBy: { startTime: 'desc' },
          take: 5
        },
        _count: {
          select: {
            bookings: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ 
        error: 'Client not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        telegramId: client.telegramId,
        telegramUsername: client.telegramUsername,
        telegramFirstName: client.telegramFirstName,
        telegramLastName: client.telegramLastName,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        source: client.source,
        lastActivity: client.lastActivity,
        createdAt: client.createdAt,
        bookings: client.bookings,
        totalBookings: client._count.bookings
      }
    })

  } catch (error) {
    console.error('❌ Error fetching Telegram client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client data' },
      { status: 500 }
    )
  }
}

// API для обновления информации о клиенте
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, teamSlug, firstName, lastName, email, phone } = body

    if (!telegramId || !teamSlug) {
      return NextResponse.json({ 
        error: 'telegramId and teamSlug are required' 
      }, { status: 400 })
    }

    // Получаем информацию о салоне
    const team = await prisma.team.findFirst({
      where: { 
        OR: [
          { slug: teamSlug },
          { bookingSlug: teamSlug }
        ]
      },
      select: { id: true }
    })

    if (!team) {
      return NextResponse.json({ 
        error: 'Salon not found' 
      }, { status: 404 })
    }

    // Ищем клиента по Telegram ID
    const existingClient = await prisma.client.findFirst({
      where: {
        telegramId: telegramId,
        teamId: team.id
      }
    })

    if (!existingClient) {
      return NextResponse.json({ 
        error: 'Client not found' 
      }, { status: 404 })
    }

    // Обновляем информацию о клиенте
    const updatedClient = await prisma.client.update({
      where: { id: existingClient.id },
      data: {
        firstName: firstName || existingClient.firstName,
        lastName: lastName || existingClient.lastName,
        email: email || existingClient.email,
        phone: phone || existingClient.phone,
        lastActivity: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      client: {
        id: updatedClient.id,
        telegramId: updatedClient.telegramId,
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        email: updatedClient.email,
        phone: updatedClient.phone,
        lastActivity: updatedClient.lastActivity
      }
    })

  } catch (error) {
    console.error('❌ Error updating Telegram client:', error)
    return NextResponse.json(
      { error: 'Failed to update client data' },
      { status: 500 }
    )
  }
}
