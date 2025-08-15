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
    if (!authHeader) return NextResponse.json({ error: 'Токен авторизации отсутствует' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const me = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!me) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    if (me.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!target) return NextResponse.json({ error: 'Целевой пользователь не найден' }, { status: 404 })
    if (target.role === 'SUPER_ADMIN') return NextResponse.json({ error: 'Нельзя изменять роль SUPER_ADMIN' }, { status: 400 })

    const body = await request.json()
    const { role } = body || {}
    const allowed = ['ADMIN', 'MASTER']
    if (!allowed.includes(role)) return NextResponse.json({ error: 'Некорректная роль' }, { status: 400 })

    const updated = await prisma.user.update({ where: { id }, data: { role } })
    return NextResponse.json({ success: true, user: { id: updated.id, role: updated.role } })
  } catch (error) {
    console.error('Superadmin set user role error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


