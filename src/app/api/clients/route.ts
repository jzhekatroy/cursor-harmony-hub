import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// GET /api/clients - получить список клиентов
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || ''
    const blocked = searchParams.get('blocked') || ''

    const skip = (page - 1) * limit

    // Строим фильтры
    const where: any = {
      teamId: payload.teamId
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { telegramUsername: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (source) {
      where.source = source
    }

    if (blocked === 'true') {
      where.isBlocked = true
    } else if (blocked === 'false') {
      where.isBlocked = false
    }

    // Получаем клиентов с пагинацией
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bookings: {
            select: {
              startTime: true,
              status: true
            },
            orderBy: {
              startTime: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              bookings: true
            }
          }
        }
      }),
      prisma.client.count({ where })
    ])

    // Добавляем lastBookingTime для каждого клиента
    const clientsWithLastBooking = clients.map(client => ({
      ...client,
      lastBookingTime: client.bookings.length > 0 ? client.bookings[0].startTime : null,
      lastBookingStatus: client.bookings.length > 0 ? client.bookings[0].status : null
    }))

    return NextResponse.json({
      clients: clientsWithLastBooking,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/clients - создать нового клиента
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      telegramId,
      telegramUsername,
      telegramFirstName,
      telegramLastName,
      telegramLanguageCode,
      vkId,
      whatsapp,
      instagram,
      source = 'ADMIN_CREATED',
      dailyBookingLimit = 3
    } = body

    // Проверяем уникальность email в рамках команды
    if (email) {
      const existingClient = await prisma.client.findFirst({
        where: {
          teamId: payload.teamId,
          email
        }
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'Клиент с таким email уже существует' },
          { status: 400 }
        )
      }
    }

    // Проверяем уникальность телефона
    if (phone) {
      const existingClient = await prisma.client.findFirst({
        where: { phone }
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'Клиент с таким телефоном уже существует' },
          { status: 400 }
        )
      }
    }

    // Проверяем уникальность Telegram ID
    if (telegramId) {
      const existingClient = await prisma.client.findFirst({
        where: { telegramId: BigInt(telegramId) }
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'Клиент с таким Telegram ID уже существует' },
          { status: 400 }
        )
      }
    }

    const client = await prisma.client.create({
      data: {
        teamId: payload.teamId,
        firstName,
        lastName,
        email,
        phone,
        telegramId: telegramId ? BigInt(telegramId) : null,
        telegramUsername,
        telegramFirstName,
        telegramLastName,
        telegramLanguageCode,
        vkId,
        whatsapp,
        instagram,
        source: source as any,
        dailyBookingLimit
      }
    })

    return NextResponse.json(client, { status: 201 })

  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}