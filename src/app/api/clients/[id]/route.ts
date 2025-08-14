import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { team: true } })
    if (!user || !user.team) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, teamId: user.teamId },
      include: {
        bookings: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            master: true,
            services: { include: { service: true } }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }

    // Агрегации по бронированиям
    const [totalBookings, lastBooking, completedAgg, plannedAgg, lostAgg] = await Promise.all([
      prisma.booking.count({ where: { teamId: user.teamId, clientId: client.id } }),
      prisma.booking.findFirst({ where: { teamId: user.teamId, clientId: client.id }, orderBy: { startTime: 'desc' } }),
      prisma.booking.aggregate({
        where: { teamId: user.teamId, clientId: client.id, status: 'COMPLETED' },
        _sum: { totalPrice: true },
        _count: { _all: true }
      }),
      prisma.booking.aggregate({
        where: { teamId: user.teamId, clientId: client.id, status: { in: ['NEW', 'CONFIRMED'] } },
        _sum: { totalPrice: true },
        _count: { _all: true }
      }),
      prisma.booking.aggregate({
        where: { teamId: user.teamId, clientId: client.id, status: { in: ['NO_SHOW', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_SALON'] } },
        _sum: { totalPrice: true },
        _count: { _all: true }
      })
    ])

    return NextResponse.json({
      id: client.id,
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      phone: client.phone || '',
      email: client.email || '',
      telegram: client.telegram || '',
      address: client.address || '',
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      metrics: {
        totalBookings,
        lastBookingAt: lastBooking?.startTime || null,
        revenue: {
          completed: Number(completedAgg._sum.totalPrice || 0),
          planned: Number(plannedAgg._sum.totalPrice || 0),
          lost: Number(lostAgg._sum.totalPrice || 0)
        },
        counts: {
          completed: completedAgg._count._all,
          planned: plannedAgg._count._all,
          lost: lostAgg._count._all
        }
      },
      recentBookings: client.bookings.map(b => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        totalPrice: b.totalPrice,
        master: { id: b.master.id, firstName: b.master.firstName, lastName: b.master.lastName },
        services: b.services.map(s => ({ id: s.service.id, name: s.service.name, duration: s.service.duration, price: s.price }))
      }))
    })
  } catch (error) {
    console.error('Client detail error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { team: true } })
    if (!user || !user.team) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const body = await request.json()
    const {
      firstName = '',
      lastName = '',
      phone = '',
      email = '',
      telegram = '',
      address = ''
    } = body || {}

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
    }

    // Проверяем, что клиент существует и принадлежит этой команде
    const existing = await prisma.client.findFirst({ where: { id: clientId, teamId: user.teamId } })
    if (!existing) {
      return NextResponse.json({ error: 'Клиент не найден' }, { status: 404 })
    }

    const normalized = {
      firstName: String(firstName || '').trim() || null,
      lastName: String(lastName || '').trim() || null,
      phone: String(phone || '').trim() || null,
      email: String(email || '').trim(),
      telegram: String(telegram || '').trim() || null,
      address: String(address || '').trim() || null,
    }

    // Проверяем уникальность email в пределах команды
    if (normalized.email !== existing.email) {
      const sameEmail = await prisma.client.findFirst({
        where: { email: normalized.email, teamId: user.teamId, NOT: { id: clientId } }
      })
      if (sameEmail) {
        return NextResponse.json({ error: 'Клиент с таким email уже существует' }, { status: 409 })
      }
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: normalized
    })

    return NextResponse.json({
      success: true,
      client: {
        id: updated.id,
        firstName: updated.firstName || '',
        lastName: updated.lastName || '',
        phone: updated.phone || '',
        email: updated.email,
        telegram: updated.telegram || '',
        address: updated.address || '',
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    })
  } catch (error) {
    console.error('Client update error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


