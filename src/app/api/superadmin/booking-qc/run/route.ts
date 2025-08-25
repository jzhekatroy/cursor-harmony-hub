import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json({ error: 'Нет токена' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('teamId') || undefined
    const sample = searchParams.get('sample') === '1'
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    let targetTeamId = teamId
    if (sample) {
      const sampleTeam = await prisma.team.findFirst({ where: { slug: 'qa-sample' } })
      if (!sampleTeam) return NextResponse.json({ error: 'Эталонная команда не найдена. Создайте через seed.' }, { status: 404 })
      targetTeamId = sampleTeam.id
    }
    if (!targetTeamId) return NextResponse.json({ error: 'Не задана команда' }, { status: 400 })

    const checks: Array<{ key: string; title: string; status: 'pass' | 'fail' | 'warn'; details?: string }> = []

    // Простейшие проверки доступности данных
    const [mastersCount, servicesCount, bookingsCount] = await Promise.all([
      prisma.master.count({ where: { teamId: targetTeamId } }),
      prisma.service.count({ where: { teamId: targetTeamId } }),
      prisma.booking.count({ where: { teamId: targetTeamId } }),
    ])
    checks.push({ key: 'masters', title: `Мастера: ${mastersCount}`, status: mastersCount > 0 ? 'pass' : 'fail' })
    checks.push({ key: 'services', title: `Услуги: ${servicesCount}`, status: servicesCount > 0 ? 'pass' : 'fail' })
    checks.push({ key: 'bookings', title: `Брони: ${bookingsCount}`, status: 'pass' })

    // TODO: добавить реальные проверки слотов/отсутствий/пересечений — на следующем шаге

    return NextResponse.json({ checks })
  } catch (err) {
    console.error('booking-qc run error', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}


