import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json({ error: 'Нет токена' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

    // Идемпотентно создаём/обновляем эталонную команду с slug=qa-sample
    const team = await prisma.team.upsert({
      where: { slug: 'qa-sample' },
      update: { name: 'QA Sample Team' },
      create: {
        name: 'QA Sample Team',
        slug: 'qa-sample',
        teamNumber: 'QASAMPLE',
        email: 'qa@sample.local',
        contactPerson: 'QA'
      }
    })

    // Минимальное наполнение (детально расширим позже):
    const service = await prisma.service.upsert({
      where: { id: `${team.id}-svc-basic` },
      update: { name: 'Базовая услуга', price: 1000, duration: 60, teamId: team.id },
      create: { id: `${team.id}-svc-basic`, name: 'Базовая услуга', price: 1000, duration: 60, teamId: team.id }
    })

    const master = await prisma.master.upsert({
      where: { id: `${team.id}-mstr-1` },
      update: { firstName: 'Иван', lastName: 'Тестовый', isActive: true, teamId: team.id },
      create: { id: `${team.id}-mstr-1`, firstName: 'Иван', lastName: 'Тестовый', isActive: true, teamId: team.id }
    })

    return NextResponse.json({ ok: true, teamId: team.id, serviceId: service.id, masterId: master.id })
  } catch (err) {
    console.error('booking-qc seed error', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}


