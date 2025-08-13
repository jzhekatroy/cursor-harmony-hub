// Seed realistic demo data for analytics and calendar UX
// Usage examples:
//   SEED_TEAM_SLUG=B0000001 node scripts/seed_realistic_demo.js
//   SEED_TEAM_ID=... SEED_BOOKINGS=2000 SEED_DAYS_BACK=365 SEED_DAYS_FORWARD=365 node scripts/seed_realistic_demo.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const RUS_FIRST = ['Анна', 'Мария', 'Елена', 'Ольга', 'Ирина', 'София', 'Алексей', 'Дмитрий', 'Иван', 'Максим', 'Егор', 'Кирилл']
const RUS_LAST = ['Иванова', 'Петрова', 'Смирнова', 'Соколова', 'Кузнецова', 'Новикова', 'Иванов', 'Петров', 'Смирнов', 'Кузнецов', 'Соколов', 'Новиков']

function addMinutes(date, minutes) { return new Date(date.getTime() + minutes * 60 * 1000) }

async function getTeam() {
  const teamId = process.env.SEED_TEAM_ID
  const teamSlug = process.env.SEED_TEAM_SLUG || 'B0000001'
  let team = null
  if (teamId) team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team && teamSlug) team = await prisma.team.findUnique({ where: { slug: teamSlug } })
  if (!team) team = await prisma.team.findFirst()
  if (!team) throw new Error('Team not found. Create a team first.')
  return team
}

async function ensureAdmin(team) {
  const email = process.env.SEED_ADMIN_EMAIL || 'analytics_admin@example.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'password'
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        teamId: team.id,
        isActive: true,
        firstName: 'Analytics',
        lastName: 'Admin'
      }
    })
  }
  return user
}

async function ensureServices(team) {
  const exists = await prisma.service.findMany({ where: { teamId: team.id } })
  if (exists.length >= 8) return exists
  const blueprints = [
    { name: 'Стрижка', duration: 45, price: 1500 },
    { name: 'Окрашивание', duration: 120, price: 4500 },
    { name: 'Укладка', duration: 40, price: 1200 },
    { name: 'Маникюр', duration: 60, price: 2000 },
    { name: 'Педикюр', duration: 75, price: 2300 },
    { name: 'Брови', duration: 30, price: 900 },
    { name: 'Массаж', duration: 90, price: 3500 },
    { name: 'Косметология', duration: 75, price: 4200 },
  ]
  const toCreate = blueprints.slice(0, 8 - exists.length)
  const created = []
  for (const s of toCreate) {
    created.push(await prisma.service.create({ data: { ...s, teamId: team.id } }))
  }
  return [...exists, ...created]
}

async function ensureMasters(team, count = 9) {
  const masters = await prisma.master.findMany({ where: { teamId: team.id }, include: { user: true } })
  if (masters.length >= count) return masters
  const list = [...masters]
  for (let i = 0; i < count - masters.length; i++) {
    const user = await prisma.user.create({
      data: {
        email: `master_demo_${Date.now()}_${i}@example.com`,
        password: await bcrypt.hash('password', 12),
        role: 'ADMIN', // чтобы можно было заходить под мастером
        teamId: team.id,
        isActive: true,
        firstName: pick(RUS_FIRST),
        lastName: pick(RUS_LAST)
      }
    })
    const master = await prisma.master.create({
      data: {
        userId: user.id,
        teamId: team.id,
        isActive: true,
        firstName: user.firstName || pick(RUS_FIRST),
        lastName: user.lastName || pick(RUS_LAST)
      },
      include: { user: true }
    })
    list.push(master)
  }
  return list
}

async function seedSchedules(team, masters) {
  // Шаблоны расписаний
  const templates = [
    // Пн-Пт 09:00–18:00, обед 13:00–14:00
    { days: [1,2,3,4,5], start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    // Вт-Сб 10:00–19:00, обед 14:00–15:00
    { days: [2,3,4,5,6], start: '10:00', end: '19:00', breakStart: '14:00', breakEnd: '15:00' },
    // Сменный: Пн,Ср,Пт 11:00–20:00, обед 15:00–16:00
    { days: [1,3,5], start: '11:00', end: '20:00', breakStart: '15:00', breakEnd: '16:00' },
  ]
  for (const m of masters) {
    await prisma.masterSchedule.deleteMany({ where: { masterId: m.id } })
    const t = pick(templates)
    for (const d of t.days) {
      await prisma.masterSchedule.create({
        data: {
          masterId: m.id,
          dayOfWeek: d,
          startTime: t.start,
          endTime: t.end,
          breakStart: t.breakStart,
          breakEnd: t.breakEnd
        }
      })
    }
  }
}

async function seedAbsences(team, masters) {
  // Сгенерируем парочку отсутствий на каждого мастера
  for (const m of masters) {
    await prisma.masterAbsence.deleteMany({ where: { masterId: m.id } })
    const now = new Date()
    // Отпуск прошлым летом или этим летом (5-10 дней)
    const base1 = new Date(now.getFullYear(), rndInt(5,7), rndInt(1,20))
    const len1 = rndInt(5,10)
    await prisma.masterAbsence.create({ data: { masterId: m.id, startDate: base1, endDate: addMinutes(base1, len1 * 24 * 60), reason: 'VACATION', isRecurring: false } })
    // Больничный на 1-3 дня в текущем/прошлом месяце
    const base2 = new Date(now.getFullYear(), now.getMonth() - rndInt(0,2), rndInt(1,25))
    const len2 = rndInt(1,3)
    await prisma.masterAbsence.create({ data: { masterId: m.id, startDate: base2, endDate: addMinutes(base2, len2 * 24 * 60), reason: 'SICK_LEAVE', isRecurring: false } })
  }
}

function* daysRange(fromDaysBack = 180, toDaysForward = 180) {
  const today = new Date()
  for (let off = -fromDaysBack; off <= toDaysForward; off++) {
    const d = new Date(today)
    d.setDate(today.getDate() + off)
    yield d
  }
}

async function getSchedulesByMaster(masters) {
  const map = {}
  for (const m of masters) {
    map[m.id] = await prisma.masterSchedule.findMany({ where: { masterId: m.id } })
  }
  return map
}

function pickSlotsWithinSchedule(date, schedule, stepMin = 15) {
  // Возвращает массив стартовых таймслотов в пределах рабочего времени, исключая перерыв
  const slots = []
  if (!schedule) return slots
  const [sh, sm] = schedule.startTime.split(':').map(Number)
  const [eh, em] = schedule.endTime.split(':').map(Number)
  const [bh, bm] = (schedule.breakStart || '00:00').split(':').map(Number)
  const [beH, beM] = (schedule.breakEnd || '00:00').split(':').map(Number)
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), sh, sm, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), eh, em, 0, 0)
  const bStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), bh, bm, 0, 0)
  const bEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), beH, beM, 0, 0)
  for (let t = new Date(start); t < end; t = addMinutes(t, stepMin)) {
    if (schedule.breakStart && t >= bStart && t < bEnd) continue
    slots.push(new Date(t))
  }
  return slots
}

async function seedBookings(team, masters, services) {
  const statusesPast = ['COMPLETED', 'NO_SHOW', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_SALON']
  const statusesFuture = ['NEW', 'CONFIRMED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_SALON']
  const schedulesMap = await getSchedulesByMaster(masters)

  let seq = rndInt(1000, 900000)
  let created = 0
  const maxBookings = Number(process.env.SEED_BOOKINGS || 2000)
  const back = Number(process.env.SEED_DAYS_BACK || 365)
  const forward = Number(process.env.SEED_DAYS_FORWARD || 365)

  // Очистку существующих броней не делаем — скрипт дополняет данные
  for (const day of daysRange(back, forward)) {
    for (const master of masters) {
      const dow = day.getDay() // 0..6
      const sched = schedulesMap[master.id].find(s => s.dayOfWeek === dow)
      if (!sched) continue
      // В этот день создаём 3–8 броней с шагом 15 минут
      const slots = pickSlotsWithinSchedule(day, sched, 15)
      if (slots.length === 0) continue
      const toCreate = rndInt(3, 8)
      const used = [] // занятые интервалы по минутам
      for (let i = 0; i < toCreate; i++) {
        const start = pick(slots)
        // Генерируем 1-2 услуги и итого длительность 30–180 минут
        const svc1 = pick(services)
        const svc2 = Math.random() < 0.3 ? pick(services) : null
        const selected = svc2 && svc2.id !== svc1.id ? [svc1, svc2] : [svc1]
        const duration = selected.reduce((a, s) => a + Number(s.duration), 0)
        const price = selected.reduce((a, s) => a + Number(s.price), 0)
        const end = addMinutes(start, Math.max(30, Math.min(180, duration)))

        // Проверим на сильное пересечение с уже добавленными в этот сеанс (упрощённо)
        const stMin = start.getHours() * 60 + start.getMinutes()
        const enMin = end.getHours() * 60 + end.getMinutes()
        const overlap = used.some(([a, b]) => (stMin < b && enMin > a))
        if (overlap && Math.random() < 0.5) continue // слегка контролируем плотность
        used.push([stMin, enMin])

        const inFuture = start > new Date()
        const status = pick(inFuture ? statusesFuture : statusesPast)

        await prisma.booking.create({
          data: {
            bookingNumber: `B${String(seq++).padStart(7, '0')}`,
            startTime: start,
            endTime: end,
            totalPrice: price,
            status,
            teamId: team.id,
            clientId: (await prisma.client.findFirst({ where: { teamId: team.id } })).id,
            masterId: master.id,
            services: { create: selected.map(s => ({ serviceId: s.id, price: s.price })) }
          }
        })

        created++
        if (created >= maxBookings) return
      }
    }
  }
}

async function main() {
  const team = await getTeam()
  await ensureAdmin(team)
  const services = await ensureServices(team)
  const masters = await ensureMasters(team, Number(process.env.SEED_MASTERS || 9))
  await seedSchedules(team, masters)
  await seedAbsences(team, masters)
  await seedBookings(team, masters, services)
  console.log('✅ Realistic demo seed completed for team:', team.slug || team.id)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })


