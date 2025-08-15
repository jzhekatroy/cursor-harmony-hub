import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Неверный формат JSON' }, { status: 400 })
    }
    const { status, reason } = body || {}
    if (!['ACTIVE', 'DISABLED'].includes(status)) {
      return NextResponse.json({ error: 'Некорректный статус' }, { status: 400 })
    }

    const now = new Date()
    const data: any = { status }
    if (status === 'DISABLED') {
      data.disabledReason = (reason || '').trim() || null
      data.disabledAt = now
    } else {
      data.disabledReason = null
      data.disabledAt = null
    }

    const team = await prisma.team.update({ where: { id }, data })
    return NextResponse.json({ success: true, team })
  } catch (error) {
    console.error('Superadmin set status error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


