import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

// GET /api/clients/[id] - получить клиента по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const client = await prisma.client.findFirst({
      where: {
        id,
        teamId: payload.teamId
      },
      include: {
        bookings: {
          orderBy: { startTime: 'desc' },
          include: {
            master: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            services: {
              include: {
                service: {
                  select: {
                    name: true,
                    price: true
                  }
                }
              }
            }
          }
        },
        // actions: {
        //   orderBy: { createdAt: 'desc' },
        //   take: 20,
        //   include: {
        //     service: {
        //       select: {
        //         name: true
        //       }
        //     },
        //     booking: {
        //       select: {
        //         bookingNumber: true,
        //         startTime: true
        //       }
        //     }
        //   }
        // },
        _count: {
          select: {
            bookings: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)

  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - обновить клиента
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

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
      notificationsEnabled,
      preferredLanguage,
      dailyBookingLimit,
      isBlocked
    } = body

    // Проверяем, что клиент существует и принадлежит команде
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        teamId: payload.teamId
      }
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Проверяем уникальность email в рамках команды (если изменился)
    if (email && email !== existingClient.email) {
      const duplicateClient = await prisma.client.findFirst({
        where: {
          teamId: payload.teamId,
          email,
          id: { not: id }
        }
      })

      if (duplicateClient) {
        return NextResponse.json(
          { error: 'Клиент с таким email уже существует' },
          { status: 400 }
        )
      }
    }

    // Проверяем уникальность телефона (если изменился)
    if (phone && phone !== existingClient.phone) {
      const duplicateClient = await prisma.client.findFirst({
        where: {
          phone,
          id: { not: id }
        }
      })

      if (duplicateClient) {
        return NextResponse.json(
          { error: 'Клиент с таким телефоном уже существует' },
          { status: 400 }
        )
      }
    }

    // Проверяем уникальность Telegram ID (если изменился)
    if (telegramId && BigInt(telegramId) !== existingClient.telegramId) {
      const duplicateClient = await prisma.client.findFirst({
        where: {
          telegramId: BigInt(telegramId),
          id: { not: id }
        }
      })

      if (duplicateClient) {
        return NextResponse.json(
          { error: 'Клиент с таким Telegram ID уже существует' },
          { status: 400 }
        )
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
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
        notificationsEnabled,
        preferredLanguage,
        dailyBookingLimit,
        isBlocked,
        lastActivity: new Date()
      }
    })

    return NextResponse.json(updatedClient)

  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - удалить клиента
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Проверяем, что клиент существует и принадлежит команде
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        teamId: payload.teamId
      },
      include: {
        bookings: {
          where: {
            status: {
              in: ['NEW', 'CONFIRMED']
            }
          }
        }
      }
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Проверяем, есть ли активные бронирования
    if (existingClient.bookings.length > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить клиента с активными бронированиями' },
        { status: 400 }
      )
    }

    await prisma.client.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Client deleted successfully' })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}