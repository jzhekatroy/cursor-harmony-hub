import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await context.params
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { team: true } })
    if (!user || !user.team) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const type = searchParams.get('type') || undefined
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    const where: any = { teamId: user.teamId, clientId }
    if (type) where.type = type
    if (from || to) where.createdAt = { gte: from, lte: to }

    const [total, items] = await Promise.all([
      prisma.clientEvent.count({ where }),
      prisma.clientEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize })
    ])

    return NextResponse.json({ total, page, pageSize, events: items })
  } catch (error) {
    console.error('Client events error:', error)
    const message = (error as any)?.message || 'Внутренняя ошибка сервера'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


