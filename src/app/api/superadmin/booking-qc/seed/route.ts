import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json({ error: 'Нет токена' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    const currentUser = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })

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

    // Создаем/обновляем пользователя для мастера
    const masterEmail = `qa.master.${team.id}@sample.local`
    const passwordHash = await hashPassword('qapass123')
    const masterUser = await prisma.user.upsert({
      where: { email: masterEmail },
      update: { teamId: team.id, role: 'ADMIN', firstName: 'Иван', lastName: 'Тестовый', password: passwordHash },
      create: { email: masterEmail, password: passwordHash, role: 'ADMIN', teamId: team.id, firstName: 'Иван', lastName: 'Тестовый' }
    })

    const master = await prisma.master.upsert({
      where: { id: `${team.id}-mstr-1` },
      update: { firstName: 'Иван', lastName: 'Тестовый', isActive: true, team: { connect: { id: team.id } } },
      create: { id: `${team.id}-mstr-1`, firstName: 'Иван', lastName: 'Тестовый', isActive: true, team: { connect: { id: team.id } }, user: { connect: { id: masterUser.id } } }
    })

    // Базовое расписание: Пн-Пт 10:00-19:00, перерыв 14:00-15:00
    for (let d = 1; d <= 5; d++) {
      await prisma.masterSchedule.upsert({
        where: { masterId_dayOfWeek: { masterId: master.id, dayOfWeek: d } },
        update: { startTime: '10:00', endTime: '19:00', breakStart: '14:00', breakEnd: '15:00' },
        create: { masterId: master.id, dayOfWeek: d, startTime: '10:00', endTime: '19:00', breakStart: '14:00', breakEnd: '15:00' }
      })
    }

    // Пример отсутствия на завтра 12:00-16:00
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24*60*60*1000)
    const absStart = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 9, 0, 0))
    const absEnd = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 13, 0, 0))
    await prisma.masterAbsence.create({ data: { masterId: master.id, startDate: absStart, endDate: absEnd, reason: 'Тестовое отсутствие' } }).catch(() => {})

    // Добавим ещё 2 мастеров с разными графиками
    const makeMaster = async (idx: number, fname: string, lname: string, schedule: Array<{ d: number, s: string, e: string, bs?: string|null, be?: string|null }>) => {
      const email = `qa.master${idx}.${team.id}@sample.local`
      const pass = await hashPassword('qapass123')
      const u = await prisma.user.upsert({
        where: { email },
        update: { teamId: team.id, role: 'ADMIN', firstName: fname, lastName: lname, password: pass },
        create: { email, password: pass, role: 'ADMIN', teamId: team.id, firstName: fname, lastName: lname }
      })
      const m = await prisma.master.upsert({
        where: { id: `${team.id}-mstr-${idx}` },
        update: { firstName: fname, lastName: lname, isActive: true, team: { connect: { id: team.id } } },
        create: { id: `${team.id}-mstr-${idx}`, firstName: fname, lastName: lname, isActive: true, team: { connect: { id: team.id } }, user: { connect: { id: u.id } } }
      })
      for (const row of schedule) {
        await prisma.masterSchedule.upsert({
          where: { masterId_dayOfWeek: { masterId: m.id, dayOfWeek: row.d } },
          update: { startTime: row.s, endTime: row.e, breakStart: row.bs ?? null, breakEnd: row.be ?? null },
          create: { masterId: m.id, dayOfWeek: row.d, startTime: row.s, endTime: row.e, breakStart: row.bs ?? null, breakEnd: row.be ?? null }
        })
      }
      return m
    }

    const master2 = await makeMaster(2, 'Мария', 'Проверочная', [
      { d: 1, s: '09:00', e: '18:00', bs: '13:00', be: '14:00' },
      { d: 2, s: '09:00', e: '18:00', bs: '13:00', be: '14:00' },
      { d: 3, s: '12:00', e: '20:00', bs: '16:00', be: '16:30' },
      { d: 4, s: '12:00', e: '20:00', bs: '16:00', be: '16:30' },
      { d: 5, s: '10:00', e: '19:00', bs: '14:00', be: '15:00' },
    ])

    const master3 = await makeMaster(3, 'Олег', 'Выходной', [
      { d: 2, s: '10:00', e: '19:00', bs: '14:00', be: '15:00' },
      { d: 3, s: '10:00', e: '19:00', bs: '14:00', be: '15:00' },
      { d: 6, s: '10:00', e: '16:00' }, // суббота короткий день
    ])

    // Группы услуг и услуги
    const groupA = await prisma.serviceGroup.upsert({
      where: { id: `${team.id}-grp-a` },
      update: { name: 'Парикмахерские услуги', teamId: team.id },
      create: { id: `${team.id}-grp-a`, name: 'Парикмахерские услуги', teamId: team.id }
    })
    const groupB = await prisma.serviceGroup.upsert({
      where: { id: `${team.id}-grp-b` },
      update: { name: 'Ногтевой сервис', teamId: team.id },
      create: { id: `${team.id}-grp-b`, name: 'Ногтевой сервис', teamId: team.id }
    })

    const svc = async (key: string, name: string, price: number, duration: number, groupId?: string) => {
      return prisma.service.upsert({
        where: { id: `${team.id}-${key}` },
        update: { name, price, duration, teamId: team.id, groupId: groupId },
        create: { id: `${team.id}-${key}`, name, price, duration, teamId: team.id, groupId: groupId }
      })
    }
    const s1 = await svc('svc-cut', 'Стрижка', 1500, 60, groupA.id)
    const s2 = await svc('svc-color', 'Окрашивание', 3500, 120, groupA.id)
    const s3 = await svc('svc-style', 'Укладка', 1200, 45, groupA.id)
    const s4 = await svc('svc-manic', 'Маникюр', 1800, 90, groupB.id)
    const s5 = await svc('svc-pedic', 'Педикюр', 2200, 90, groupB.id)
    const s6 = await svc('svc-gel', 'Гель-лак', 1600, 75, groupB.id)

    // Клиенты
    const clientIds: string[] = []
    for (let i = 1; i <= 8; i++) {
      const c = await prisma.client.upsert({
        where: { email_teamId: { email: `qa.client${i}@sample.local`, teamId: team.id } },
        update: { firstName: `Клиент${i}`, lastName: 'Тест' },
        create: { email: `qa.client${i}@sample.local`, firstName: `Клиент${i}`, lastName: 'Тест', teamId: team.id }
      })
      clientIds.push(c.id)
    }

    // Функция для вычисления времени (локальное MSK -> UTC на дату)
    const toUtc = (base: Date, hourLocal: number, minutesLocal: number) => {
      // MSK = UTC+3, упрощённо
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hourLocal - 3, minutesLocal, 0))
      return d
    }

    // Брони на ближайшие дни
    const day0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    const mkDay = (plusDays: number) => new Date(day0.getTime() + plusDays * 24 * 60 * 60 * 1000)

    const createBooking = async (key: string, day: Date, masterId: string, clientIdx: number, startHourLocal: number, durMin: number, serviceId: string, price: number) => {
      const start = toUtc(day, startHourLocal, 0)
      const end = new Date(start.getTime() + durMin * 60 * 1000)
      const bookingNumber = `QA-${key}-${day.toISOString().slice(0,10)}`
      const booking = await prisma.booking.upsert({
        where: { bookingNumber },
        update: { startTime: start, endTime: end, totalPrice: price, masterId, clientId: clientIds[clientIdx], teamId: team.id, status: 'CONFIRMED' },
        create: { bookingNumber, startTime: start, endTime: end, totalPrice: price, masterId, clientId: clientIds[clientIdx], teamId: team.id, status: 'CONFIRMED' }
      })
      await prisma.bookingService.upsert({
        where: { bookingId_serviceId: { bookingId: booking.id, serviceId } },
        update: { price: price },
        create: { bookingId: booking.id, serviceId, price: price }
      })
      return booking
    }

    // Нормальные брони (без конфликтов)
    await createBooking('ok-1', mkDay(1), master.id, 0, 10, 60, s1.id, 1500)
    await createBooking('ok-2', mkDay(1), master2.id, 1, 12, 45, s3.id, 1200)
    await createBooking('ok-3', mkDay(2), master3.id, 2, 10, 90, s4.id, 1800)

    // Граничные к перерыву у master (до 14:00 и после 15:00)
    await createBooking('edge-before-break', mkDay(1), master.id, 3, 13, 60, s1.id, 1500) // 13:00-14:00
    await createBooking('edge-after-break', mkDay(1), master.id, 4, 15, 60, s1.id, 1500)  // 15:00-16:00

    // Конфликтные брони (пересечение у master2)
    await createBooking('overlap-a', mkDay(2), master2.id, 5, 12, 90, s2.id, 3500) // 12:00-13:30
    await createBooking('overlap-b', mkDay(2), master2.id, 6, 13, 60, s3.id, 1200)  // 13:00-14:00 (перекрывает 12:00-13:30)

    return NextResponse.json({ ok: true, teamId: team.id, serviceId: service.id, masterId: master.id })
  } catch (err) {
    console.error('booking-qc seed error', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}


