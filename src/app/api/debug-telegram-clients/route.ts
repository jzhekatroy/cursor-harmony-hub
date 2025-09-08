import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Получаем всех клиентов с Telegram ID
    const clients = await prisma.client.findMany({
      where: {
        telegramId: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramLastName: true,
        source: true,
        createdAt: true,
        teamId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Сериализуем BigInt
    const serializedClients = clients.map(client => ({
      ...client,
      telegramId: client.telegramId?.toString() || null
    }))

    return NextResponse.json({
      clients: serializedClients,
      total: serializedClients.length
    })

  } catch (error) {
    console.error('Error fetching Telegram clients:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}