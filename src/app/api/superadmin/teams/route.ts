import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '20')))

    const where: any = {}
    if (q) {
      where.OR = [
        { teamNumber: { contains: q } },
        { email: { contains: q } },
        { name: { contains: q } },
        { contactPerson: { contains: q } },
      ]
    }

    const total = await prisma.team.count({ where })
    const teams = await prisma.team.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        teamNumber: true,
        createdAt: true,
        status: true,
        contactPerson: true,
        email: true,
        masterLimit: true,
      }
    })

    // Счётчики
    const results = await Promise.all(teams.map(async (t) => {
      const [mastersCount, clientsCount, bookingsCount] = await Promise.all([
        prisma.master.count({ where: { teamId: t.id } }),
        prisma.client.count({ where: { teamId: t.id } }),
        prisma.booking.count({ where: { teamId: t.id } }),
      ])
      return {
        ...t,
        mastersCount,
        clientsCount,
        bookingsCount,
      }
    }))

    return NextResponse.json({
      total,
      page,
      pageSize,
      teams: results
    })
  } catch (error) {
    console.error('Superadmin teams error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


