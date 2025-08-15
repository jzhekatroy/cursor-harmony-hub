import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    if (me.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '20')))

    const where: any = {}
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { team: { teamNumber: { contains: q } } }
      ]
    }

    const total = await prisma.user.count({ where })
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        team: { select: { id: true, name: true, teamNumber: true } }
      }
    })

    return NextResponse.json({ total, page, pageSize, users })
  } catch (error) {
    console.error('Superadmin users error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


