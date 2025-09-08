import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { telegramId, teamSlug, phone, email } = await request.json()

    console.log('🔍 Debug client search:', {
      telegramId,
      teamSlug,
      phone,
      email
    })

    // Находим команду
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug }
    })

    if (!team) {
      return NextResponse.json({
        error: 'Team not found',
        teamSlug
      }, { status: 404 })
    }

    console.log('✅ Team found:', {
      id: team.id,
      name: team.name,
      slug: team.slug
    })

    let client = null

    // Поиск по Telegram ID
    if (telegramId) {
      console.log('🔍 Searching by Telegram ID:', telegramId)
      client = await prisma.client.findFirst({
        where: { 
          telegramId: BigInt(telegramId), 
          teamId: team.id 
        }
      })
      console.log('📱 Telegram ID search result:', client ? { id: client.id, telegramId: client.telegramId?.toString() } : 'Not found')
    }

    // Поиск по email
    if (!client && email) {
      console.log('🔍 Searching by email:', email)
      client = await prisma.client.findFirst({
        where: { email, teamId: team.id }
      })
      console.log('📧 Email search result:', client ? { id: client.id, email: client.email } : 'Not found')
    }

    // Поиск по телефону
    if (!client && phone) {
      console.log('🔍 Searching by phone:', phone)
      client = await prisma.client.findFirst({
        where: { phone, teamId: team.id }
      })
      console.log('📞 Phone search result:', client ? { id: client.id, phone: client.phone } : 'Not found')
    }

    // Получаем всех клиентов команды для сравнения
    const allClients = await prisma.client.findMany({
      where: { teamId: team.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        telegramId: true,
        source: true
      }
    })

    const serializedClients = allClients.map(c => ({
      ...c,
      telegramId: c.telegramId?.toString() || null
    }))

    return NextResponse.json({
      searchResult: client ? {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email,
        telegramId: client.telegramId?.toString() || null,
        source: client.source
      } : null,
      allClients: serializedClients,
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug
      }
    })

  } catch (error) {
    console.error('Error in debug client search:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
