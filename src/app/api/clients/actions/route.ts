import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// POST /api/clients/actions - записать действие клиента
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
      clientId,
      actionType,
      pageUrl,
      serviceId,
      bookingId,
      telegramData
    } = body

    // Проверяем, что клиент существует и принадлежит команде
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          teamId: payload.teamId
        }
      })

      if (!client) {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        )
      }
    }

    // Проверяем, что услуга существует (если указана)
    if (serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          teamId: payload.teamId
        }
      })

      if (!service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        )
      }
    }

    // Проверяем, что бронирование существует (если указано)
    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          teamId: payload.teamId
        }
      })

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }
    }

    const action = await prisma.clientAction.create({
      data: {
        clientId,
        teamId: payload.teamId,
        actionType: actionType as any,
        pageUrl,
        serviceId,
        bookingId,
        telegramData
      }
    })

    // Обновляем lastActivity клиента
    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { lastActivity: new Date() }
      })
    }

    return NextResponse.json(action, { status: 201 })

  } catch (error) {
    console.error('Error creating client action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/clients/actions - получить действия клиентов
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const clientId = searchParams.get('clientId')
    const actionType = searchParams.get('actionType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Строим фильтры
    const where: any = {
      teamId: payload.teamId
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (actionType) {
      where.actionType = actionType
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Получаем действия с пагинацией
    const [actions, total] = await Promise.all([
      prisma.clientAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              telegramUsername: true
            }
          },
          service: {
            select: {
              id: true,
              name: true
            }
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              startTime: true
            }
          }
        }
      }),
      prisma.clientAction.count({ where })
    ])

    return NextResponse.json({
      actions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching client actions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
