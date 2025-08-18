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
    const q = (searchParams.get('q') || '').trim() // email substring
    const teamNumber = (searchParams.get('teamNumber') || '').trim()
    const successParam = searchParams.get('success') // 'true' | 'false' | null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '20')))

    const where: any = {}
    if (q) where.email = { contains: q }
    if (successParam === 'true') where.success = true
    if (successParam === 'false') where.success = false
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as any).gte = new Date(dateFrom)
      if (dateTo) (where.createdAt as any).lte = new Date(dateTo)
    }
    if (teamNumber) {
      const team = await prisma.team.findFirst({ where: { teamNumber } })
      where.teamId = team ? team.id : '__no_team__' // заведомо пусто, если не нашли
    }

    const total = await prisma.userLoginLog.count({ where })
    const logs = await prisma.userLoginLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, email: true, role: true } },
        team: { select: { id: true, teamNumber: true, name: true } },
      }
    })

    return NextResponse.json({ total, page, pageSize, logs })
  } catch (error) {
    console.error('Superadmin login logs error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


