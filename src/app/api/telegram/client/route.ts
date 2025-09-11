import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')
    const teamSlug = searchParams.get('teamSlug')

    console.log('🔍 Telegram client API called:', { telegramId, teamSlug })
    
    // Отправляем лог на сервер
    try {
      await fetch('https://test.2minutes.ru/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'TELEGRAM_CLIENT_API_CALLED',
          data: { telegramId, teamSlug, timestamp: new Date().toISOString() }
        })
      })
    } catch (e) {
      console.error('Failed to send log:', e)
    }

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
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramLanguageCode: true
      }
    })

    console.log('🔍 Client found in DB:', {
      found: !!client,
      client: client ? {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        telegramId: client.telegramId?.toString(),
        telegramFirstName: client.telegramFirstName,
        telegramLastName: client.telegramLastName
      } : null,
      searchParams: { telegramId, teamSlug, teamId: team.id }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error fetching Telegram client:', error)
    
    // Отправляем лог ошибки на сервер
    try {
      await fetch('https://test.2minutes.ru/api/telegram/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'TELEGRAM_CLIENT_API_ERROR',
          data: { 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          }
        })
      })
    } catch (e) {
      console.error('Failed to send error log:', e)
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}