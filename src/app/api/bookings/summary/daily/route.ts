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

    const masterIds = masterIdsParam.split(',').map(s => s.trim()).filter(Boolean)
    const serviceIds = serviceIdsParam.split(',').map(s => s.trim()).filter(Boolean)
    const statusesFilter = statusParam.split(',').map(s => s.trim()).filter(Boolean)

    // Build days list [from, to)
    const days: Date[] = []
    for (let t = fromDate.getTime(); t < toDate.getTime(); t += 24 * 60 * 60 * 1000) {
      days.push(new Date(t))
    }

    const inStatuses = (candidate: string[]) => {
      if (statusesFilter.length === 0) return candidate
      return candidate.filter(s => statusesFilter.includes(s))
    }

    const results: Array<{ day: string, count: number, revenueSalon: number, revenueLost: number }> = []

    for (const day of days) {
      const start = new Date(day)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

      const baseBookingWhere: any = {
        teamId,
        startTime: { gte: start, lt: end }
      }
      if (masterIds.length > 0) baseBookingWhere.masterId = { in: masterIds }

      // Count of bookings for the day (respect statuses and services filters if provided)
      const countWhere: any = { ...baseBookingWhere }
      if (statusesFilter.length > 0) countWhere.status = { in: statusesFilter }
      if (serviceIds.length > 0) {
        countWhere.services = { some: { serviceId: { in: serviceIds } } }
      }
      const count = await prisma.booking.count({ where: countWhere })

      // Revenue: planned (NEW + CONFIRMED) — используем итоговую цену брони (totalPrice)
      const plannedStatuses = inStatuses(['NEW', 'CONFIRMED'])
      let sumPlanned = 0
      if (plannedStatuses.length > 0) {
        const wherePlanned: any = { ...baseBookingWhere, status: { in: plannedStatuses } }
        if (masterIds.length > 0) wherePlanned.masterId = { in: masterIds }
        if (serviceIds.length > 0) wherePlanned.services = { some: { serviceId: { in: serviceIds } } }
        const agg = await prisma.booking.aggregate({ _sum: { totalPrice: true }, where: wherePlanned })
        sumPlanned = agg._sum.totalPrice ? Number(agg._sum.totalPrice) : 0
      }

      // Revenue: completed (COMPLETED) — используем итоговую цену брони (totalPrice)
      const completedStatuses = inStatuses(['COMPLETED'])
      let sumCompleted = 0
      if (completedStatuses.length > 0) {
        const whereCompleted: any = { ...baseBookingWhere, status: { in: completedStatuses } }
        if (masterIds.length > 0) whereCompleted.masterId = { in: masterIds }
        if (serviceIds.length > 0) whereCompleted.services = { some: { serviceId: { in: serviceIds } } }
        const agg = await prisma.booking.aggregate({ _sum: { totalPrice: true }, where: whereCompleted })
        sumCompleted = agg._sum.totalPrice ? Number(agg._sum.totalPrice) : 0
      }

      // Revenue: lost (NO_SHOW + CANCELLED_*) — используем итоговую цену брони (totalPrice)
      const lostStatuses = inStatuses(['NO_SHOW', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_SALON'])
      let sumLost = 0
      if (lostStatuses.length > 0) {
        const whereLost: any = { ...baseBookingWhere, status: { in: lostStatuses } }
        if (masterIds.length > 0) whereLost.masterId = { in: masterIds }
        if (serviceIds.length > 0) whereLost.services = { some: { serviceId: { in: serviceIds } } }
        const agg = await prisma.booking.aggregate({ _sum: { totalPrice: true }, where: whereLost })
        sumLost = agg._sum.totalPrice ? Number(agg._sum.totalPrice) : 0
      }

      results.push({
        day: start.toISOString(),
        count,
        revenueSalon: sumPlanned + sumCompleted,
        revenueLost: sumLost
      })
    }

    return NextResponse.json({
      daily: results
    })
  } catch (error) {
    console.error('Daily summary fetch error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}


