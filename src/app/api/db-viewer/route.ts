import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию superadmin
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Superadmin access required' }, { status: 403 })
    }
    // Получаем все таблицы и их данные
    const clients = await prisma.client.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            services: true,
            master: true
          }
        },
        actions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    const teams = await prisma.team.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    const services = await prisma.service.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    })

    const masters = await prisma.master.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    })

    const bookings = await prisma.booking.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        services: true,
        master: true
      }
    })

    // Конвертируем BigInt в строки для JSON сериализации
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      if (Array.isArray(obj)) return obj.map(serializeBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key])
        }
        return result
      }
      return obj
    }

    return NextResponse.json({
      success: true,
      data: {
        clients: serializeBigInt(clients),
        teams: serializeBigInt(teams),
        services: serializeBigInt(services),
        masters: serializeBigInt(masters),
        bookings: serializeBigInt(bookings),
        stats: {
          totalClients: clients.length,
          totalTeams: teams.length,
          totalServices: services.length,
          totalMasters: masters.length,
          totalBookings: bookings.length
        }
      }
    })
  } catch (error) {
    console.error('Database viewer error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}