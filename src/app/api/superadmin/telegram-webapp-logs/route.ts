import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Получаем логи Telegram WebApp за последние 24 часа
    const logs = await prisma.telegramLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // последние 24 часа
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // максимум 100 записей
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching Telegram WebApp logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
