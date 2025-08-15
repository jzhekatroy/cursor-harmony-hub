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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const masterIdsParam = searchParams.get('masterIds') || ''
    const serviceIdsParam = searchParams.get('serviceIds') || ''
    const statusParam = searchParams.get('status') || ''

    if (!from || !to) {
      return NextResponse.json({ error: 'Параметры from и to обязательны' }, { status: 400 })
    }

    const fromDate = new Date(from)
    const toDate = new Date(to)

    const teamId = user.teamId

    // Автообновление: все прошедшие подтвержденные брони переводим в COMPLETED
    // Выполняем перед расчетом статистики, в рамках команды
    await prisma.booking.updateMany({
      where: {
        teamId,
        status: 'CONFIRMED',
        endTime: { lt: new Date() }
      },
      data: { status: 'COMPLETED' }
    })

    const masterIds = masterIdsParam
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const serviceIds = serviceIdsParam
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const baseWhere: any = {
      teamId,
      startTime: { gte: fromDate, lt: toDate }
    }

    const extraWhere: any = {}
    if (masterIds.length > 0) {
      extraWhere.masterId = { in: masterIds }
    }
    if (serviceIds.length > 0) {
      extraWhere.services = {
        some: { serviceId: { in: serviceIds } }
      }
    }
    const statuses = statusParam
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const statsFor = async (status: string) => {
      if (statuses.length > 0 && !statuses.includes(status)) {
        return { count: 0, amount: 0 }
      }
      // Count бронирований
      const count = await prisma.booking.count({
        where: { ...baseWhere, ...extraWhere, status }
      })
      // Сумма по ИТОГОВОЙ цене брони (totalPrice), чтобы учитывать редактирование цен
      const bookingSumWhere: any = { ...baseWhere, status }
      if (extraWhere.masterId) bookingSumWhere.masterId = extraWhere.masterId
      if (extraWhere.services) bookingSumWhere.services = extraWhere.services
      const agg = await prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: bookingSumWhere
      })
      const amount = agg._sum.totalPrice ? Number(agg._sum.totalPrice) : 0
      return { count, amount }
    }

    const [completed, confirmed, planned, noShow, cancelledByClient, cancelledBySalon] = await Promise.all([
      statsFor('COMPLETED'),
      statsFor('CONFIRMED'),
      statsFor('NEW'),
      statsFor('NO_SHOW'),
      statsFor('CANCELLED_BY_CLIENT'),
      statsFor('CANCELLED_BY_SALON'),
    ])

    return NextResponse.json({
      summary: {
        COMPLETED: completed,
        CONFIRMED: confirmed,
        NEW: planned,
        NO_SHOW: noShow,
        CANCELLED_BY_CLIENT: cancelledByClient,
        CANCELLED_BY_SALON: cancelledBySalon
      }
    })
  } catch (error) {
    console.error('Summary fetch error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
