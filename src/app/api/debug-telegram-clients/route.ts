import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const clients = await prisma.client.findMany({
      where: {
        telegramId: {
          not: null
        }
      },
      select: {
        id: true,
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramLastName: true,
        firstName: true,
        lastName: true,
        email: true,
        source: true,
        createdAt: true,
        teamId: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json({
      success: true,
      clients: clients.map(client => ({
        ...client,
        telegramId: client.telegramId?.toString()
      }))
    })
  } catch (error) {
    console.error('Error fetching Telegram clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
