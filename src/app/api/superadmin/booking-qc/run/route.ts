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
    const stepOverride = searchParams.get('step') ? Number(searchParams.get('step')) : undefined

    let targetTeamId = teamId
    if (sample) {
      const sampleTeam = await prisma.team.findFirst({ where: { slug: 'qa-sample' } })
      if (!sampleTeam) return NextResponse.json({ error: 'Эталонная команда не найдена. Создайте через seed.' }, { status: 404 })
      targetTeamId = sampleTeam.id
    }
    if (!targetTeamId) return NextResponse.json({ error: 'Не задана команда' }, { status: 400 })

    const checks: Array<{ key: string; title: string; status: 'pass' | 'fail' | 'warn'; details?: string; detailsList?: Array<{ human: string; tech: string }> }> = []

    // Диапазон дат: по умолчанию ближайшие 7 дней
    const now = new Date()
    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Базовые числа
    const [masters, servicesCount, bookings, teamInfo] = await Promise.all([
      prisma.master.findMany({
        where: { teamId: targetTeamId, isActive: true },
        include: { schedules: true, absences: true }
      }),
      prisma.service.count({ where: { teamId: targetTeamId } }),
      prisma.booking.findMany({
        where: {
          teamId: targetTeamId,
          status: { in: ['NEW', 'CONFIRMED', 'COMPLETED'] as any },
          startTime: { gte: fromDate },
          endTime: { lte: toDate },
        },
        select: { id: true, masterId: true, startTime: true, endTime: true }
      }),
      prisma.team.findUnique({ where: { id: targetTeamId }, select: { timezone: true, bookingStep: true } })
    ])

    const tz = teamInfo?.timezone || 'Europe/Moscow'
    const stepMinutes = stepOverride || teamInfo?.bookingStep || 15

    checks.push({ key: 'masters', title: `Активных мастеров: ${masters.length}`, status: masters.length > 0 ? 'pass' : 'fail' })
    checks.push({ key: 'services', title: `Услуги: ${servicesCount}`, status: servicesCount > 0 ? 'pass' : 'fail' })
    checks.push({ key: 'bookingsCount', title: `Брони в диапазоне: ${bookings.length}`, status: 'pass' })

    // Проверка: у мастеров есть расписание
    const mastersNoSchedule = masters.filter(m => !m.schedules || m.schedules.length === 0)
    checks.push({
      key: 'schedulesExist',
      title: mastersNoSchedule.length === 0 ? 'Расписания у всех мастеров' : `Без расписания: ${mastersNoSchedule.length}`,
      status: mastersNoSchedule.length === 0 ? 'pass' : 'warn',
      details: mastersNoSchedule.length ? mastersNoSchedule.map(m => `• ${m.firstName} ${m.lastName} (${m.id})`).join('\n') : undefined
    })

    // Проверка: пересечения броней по мастерам
    let overlapIssues = 0
    const byMaster: Record<string, { start: Date; end: Date; id: string }[]> = {}
    for (const b of bookings) {
      if (!byMaster[b.masterId]) byMaster[b.masterId] = []
      byMaster[b.masterId].push({ start: b.startTime, end: b.endTime, id: b.id })
    }
    const overlapDetails: string[] = []
    const overlapDetailsList: Array<{ human: string; tech: string }> = []
    const masterName: Record<string, string> = {}
    for (const m of masters) masterName[m.id] = `${m.firstName} ${m.lastName}`.trim()
    const fmt = (d: Date) => new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d)
    for (const [mid, arr] of Object.entries(byMaster)) {
      arr.sort((a, b) => a.start.getTime() - b.start.getTime())
      for (let i = 1; i < arr.length; i++) {
        if (arr[i - 1].end > arr[i].start) {
          overlapIssues++
          overlapDetails.push(`• master=${mid} booking ${arr[i - 1].id} overlaps ${arr[i].id}`)
          overlapDetailsList.push({
            human: `${masterName[mid] || mid}: бронь ${fmt(arr[i - 1].start)}–${fmt(arr[i - 1].end)} пересекается с ${fmt(arr[i].start)}–${fmt(arr[i].end)}`,
            tech: `master=${mid} bookingA=${arr[i - 1].id} bookingB=${arr[i].id}`
          })
        }
      }
    }
    checks.push({
      key: 'noOverlaps',
      title: overlapIssues === 0 ? 'Пересечений броней не найдено' : `Пересечения: ${overlapIssues}`,
      status: overlapIssues === 0 ? 'pass' : 'fail',
      details: overlapDetails.length ? overlapDetails.slice(0, 50).join('\n') : undefined,
      detailsList: overlapDetailsList
    })

    // Проверка: брони не внутри отсутствий мастеров
    const absencesByMaster: Record<string, { start: Date; end: Date; id: string }[]> = {}
    for (const m of masters) {
      absencesByMaster[m.id] = (m.absences || []).map(a => ({ start: a.startDate, end: a.endDate, id: a.id }))
    }
    let absenceConflicts = 0
    const absenceDetails: string[] = []
    const absenceDetailsList: Array<{ human: string; tech: string }> = []
    for (const b of bookings) {
      const aList = absencesByMaster[b.masterId] || []
      for (const a of aList) {
        if (a.start < b.endTime && a.end > b.startTime) {
          absenceConflicts++
          absenceDetails.push(`• master=${b.masterId} booking=${b.id} overlaps absence=${a.id}`)
          absenceDetailsList.push({
            human: `${masterName[b.masterId] || b.masterId}: бронь ${fmt(b.startTime)}–${fmt(b.endTime)} пересекается с отсутствием ${fmt(a.start)}–${fmt(a.end)}`,
            tech: `master=${b.masterId} booking=${b.id} absence=${a.id}`
          })
        }
      }
    }
    checks.push({
      key: 'noAbsenceConflicts',
      title: absenceConflicts === 0 ? 'Нет броней во время отсутствий' : `Конфликты с отсутствиями: ${absenceConflicts}`,
      status: absenceConflicts === 0 ? 'pass' : 'fail',
      details: absenceDetails.length ? absenceDetails.slice(0, 50).join('\n') : undefined,
      detailsList: absenceDetailsList
    })

    // Проверка: бронь в пределах рабочего времени и не внутри перерыва
    function toHHMMInTz(d: Date, tz: string) {
      const fmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
      const parts = fmt.formatToParts(d)
      const hh = parts.find(p => p.type === 'hour')?.value || '00'
      const mm = parts.find(p => p.type === 'minute')?.value || '00'
      return `${hh}:${mm}`
    }
    function toWeekdayInTz(d: Date, tz: string) {
      // 0..6 (вс..сб) в TZ
      const z = new Date(d.toLocaleString('en-US', { timeZone: tz }))
      return z.getDay()
    }

    const withinIssues: string[] = []
    let withinFail = 0
    const schedulesByMaster: Record<string, any[]> = {}
    for (const m of masters) schedulesByMaster[m.id] = m.schedules || []
    function timeLe(a: string, b: string) { return a <= b }
    function timeLt(a: string, b: string) { return a < b }
    function inWorkWindow(start: string, end: string, s: any) {
      if (!timeLe(s.startTime, start) || !timeLe(end, s.endTime)) return false
      if (s.breakStart && s.breakEnd) {
        // не допускаем, что бронь целиком внутри перерыва
        if (timeLe(s.breakStart, start) && timeLe(end, s.breakEnd)) return false
      }
      return true
    }
    for (const b of bookings) {
      const wd = toWeekdayInTz(b.startTime, tz)
      const sList = schedulesByMaster[b.masterId] || []
      const daySchedule = sList.find(s => s.dayOfWeek === wd)
      if (!daySchedule) {
        withinFail++
        withinIssues.push(`• master=${b.masterId} booking=${b.id} without day schedule`)
        continue
      }
      const hhmmStart = toHHMMInTz(b.startTime, tz)
      const hhmmEnd = toHHMMInTz(b.endTime, tz)
      if (!inWorkWindow(hhmmStart, hhmmEnd, daySchedule)) {
        withinFail++
        withinIssues.push(`• master=${b.masterId} booking=${b.id} out of working window or in break (${daySchedule.startTime}-${daySchedule.endTime}${daySchedule.breakStart ? `, break ${daySchedule.breakStart}-${daySchedule.breakEnd}` : ''})`)
      }
    }
    checks.push({
      key: 'withinWorkingHours',
      title: withinFail === 0 ? 'Все брони в пределах рабочего времени' : `Нарушений рабочего времени: ${withinFail}`,
      status: withinFail === 0 ? 'pass' : 'fail',
      details: withinIssues.length ? withinIssues.slice(0, 50).join('\n') : undefined
    })

    // Проверка: теоретическая доступность слотов (по расписанию, без учёта броней/отсутствий)
    let mastersAlwaysZero = 0
    for (const m of masters) {
      let anyDayOk = false
      for (const s of m.schedules) {
        // длина смены минус перерыв
        const [sh, sm] = s.startTime.split(':').map((x: string) => parseInt(x, 10) || 0)
        const [eh, em] = s.endTime.split(':').map((x: string) => parseInt(x, 10) || 0)
        let minutes = (eh * 60 + em) - (sh * 60 + sm)
        if (s.breakStart && s.breakEnd) {
          const [bh, bm] = s.breakStart.split(':').map((x: string) => parseInt(x, 10) || 0)
          const [ch, cm] = s.breakEnd.split(':').map((x: string) => parseInt(x, 10) || 0)
          minutes -= Math.max(0, (ch * 60 + cm) - (bh * 60 + bm))
        }
        if (minutes >= 30) { anyDayOk = true; break }
      }
      if (!anyDayOk) mastersAlwaysZero++
    }
    checks.push({
      key: 'theoreticalSlots',
      title: mastersAlwaysZero === 0 ? 'Теоретически доступны слоты по расписанию' : `Мастера без теоретических слотов: ${mastersAlwaysZero}`,
      status: mastersAlwaysZero === 0 ? 'pass' : 'warn'
    })

    // Доп.проверка формирования слотов (сэмпл):
    try {
      const sampleMaster = masters[0]
      if (sampleMaster) {
        const grid: string[] = []
        for (let m = 10*60; m <= 19*60 - stepMinutes; m += stepMinutes) {
          const hh = String(Math.floor(m/60)).padStart(2,'0')
          const mm = String(m%60).padStart(2,'0')
          grid.push(`${hh}:${mm}`)
        }
        if (grid.length > 0) {
          checks.push({ key: 'slotGrid', title: `Сетка слотов кратна ${stepMinutes} мин (примерно ${grid.length} позиций)`, status: 'pass' })
        }
      }
    } catch {}

    return NextResponse.json({ checks })
  } catch (err) {
    console.error('booking-qc run error', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}


