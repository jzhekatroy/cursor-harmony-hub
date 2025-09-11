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


    return NextResponse.json({ 
      client: client ? {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        telegramId: client.telegramId ? client.telegramId.toString() : null,
        telegramUsername: client.telegramUsername,
        telegramFirstName: client.telegramFirstName,
        telegramLastName: client.telegramLastName,
        telegramLanguageCode: client.telegramLanguageCode
      } : null
    })
  } catch (error) {
    console.error('Error fetching Telegram client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}