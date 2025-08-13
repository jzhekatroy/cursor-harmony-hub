// Seed large test dataset for analytics validation
// Usage: node scripts/seed_analytics.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickOne(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

async function ensureBaseData(team) {
  // Ensure 5-6 services
  const existingServices = await prisma.service.findMany({ where: { teamId: team.id } })
  if (existingServices.length >= 5) return existingServices

  const serviceBlueprints = [
    { name: 'Стрижка', duration: 45, price: 1500 },
    { name: 'Окрашивание', duration: 120, price: 4500 },
    { name: 'Укладка', duration: 40, price: 1200 },
    { name: 'Маникюр', duration: 60, price: 2000 },
    { name: 'Педикюр', duration: 70, price: 2300 },
    { name: 'Брови', duration: 30, price: 900 },
  ]
  const toCreate = serviceBlueprints.slice(0, 6 - existingServices.length)
  const created = []
  for (const s of toCreate) {
    created.push(await prisma.service.create({
      data: {
        name: s.name,
        duration: s.duration,
        price: s.price,
        teamId: team.id
      }
    }))
  }
  return [...existingServices, ...created]
}

async function ensureMasters(team, howMany = 9) {
  const existingMasters = await prisma.master.findMany({ where: { teamId: team.id }, include: { user: true } })
  if (existingMasters.length >= howMany) return existingMasters

  const masters = [...existingMasters]
  const need = howMany - existingMasters.length
  for (let i = 0; i < need; i++) {
    const firstName = `ТестМастер${existingMasters.length + i + 1}`
    const lastName = `Аналитика${existingMasters.length + i + 1}`
    const user = await prisma.user.create({
      data: {
        email: `master_${Date.now()}_${i}@example.com`,
        password: 'password',
        role: 'MASTER',
        teamId: team.id,
        isActive: true
      }
    })
    const master = await prisma.master.create({
      data: {
        firstName,
        lastName,
        userId: user.id,
        teamId: team.id,
        isActive: true
      },
      include: { user: true }
    })
    masters.push(master)
  }
  return masters
}

async function ensureAdminTestUser(team) {
  const email = process.env.SEED_ADMIN_EMAIL || 'analytics_admin@example.com'
  const passwordPlain = process.env.SEED_ADMIN_PASSWORD || 'password'
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(passwordPlain, 12),
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

async function ensureClients(team, howMany = 50) {
  const existing = await prisma.client.findMany({ where: { teamId: team.id } })
  if (existing.length >= howMany) return existing
  const clients = [...existing]
  const need = howMany - existing.length
  for (let i = 0; i < need; i++) {
    clients.push(await prisma.client.create({
      data: {
        email: `client_${Date.now()}_${i}@example.com`,
        firstName: `Клиент${i + 1}`,
        lastName: `Тест${i + 1}`,
        teamId: team.id
      }
    }))
  }
  return clients
}

function* dateRangeAroundToday(daysBack = 365, daysForward = 365, stepDays = 3) {
  const today = new Date()
  for (let d = -daysBack; d <= daysForward; d += stepDays) {
    const dt = new Date(today)
    dt.setDate(today.getDate() + d)
    // фиксированное время дня для предсказуемости
    dt.setHours(10 + (Math.abs(d) % 7), (Math.abs(d * 13) % 4) * 15, 0, 0)
    yield dt
  }
}

function buildBookingNumber(seq) {
  return `B${String(seq).padStart(7, '0')}`
}

async function main() {
  const teamId = process.env.SEED_TEAM_ID
  const teamSlug = process.env.SEED_TEAM_SLUG
  let team = null
  if (teamId) {
    team = await prisma.team.findUnique({ where: { id: teamId } })
  } else if (teamSlug) {
    team = await prisma.team.findUnique({ where: { slug: teamSlug } })
  } else {
    team = await prisma.team.findFirst()
  }
  if (!team) {
    throw new Error('В базе не найдено ни одной команды (Team). Создайте команду перед запуском сида.')
  }

  const services = await ensureBaseData(team)
  const masters = await ensureMasters(team, Number(process.env.SEED_MASTERS || 9))
  const clients = await ensureClients(team, Number(process.env.SEED_CLIENTS || 60))
  const adminUser = await ensureAdminTestUser(team)

  console.log(`Team: ${team.name} (${team.id}) | services: ${services.length} | masters: ${masters.length} | clients: ${clients.length}`)
  console.log(`Admin test user: ${adminUser.email} / password`)

  const statuses = ['NEW', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_SALON']

  let created = 0
  let seq = Math.floor(Math.random() * 1000000)
  const targetCount = Number(process.env.SEED_BOOKINGS || 1200)

  const daysBack = Number(process.env.SEED_DAYS_BACK || 365)
  const daysForward = Number(process.env.SEED_DAYS_FORWARD || 365)
  for (const baseStart of dateRangeAroundToday(daysBack, daysForward, 1)) {
    // в каждый день создадим 1-4 брони
    const countPerDay = randomInt(1, 4)
    for (let i = 0; i < countPerDay; i++) {
      const master = pickOne(masters)
      const client = pickOne(clients)
      const firstService = pickOne(services)
      let secondService = null
      if (Math.random() < 0.35) {
        // попробуем выбрать вторую, отличную от первой
        for (let t = 0; t < 3; t++) {
          const candidate = pickOne(services)
          if (candidate.id !== firstService.id) { secondService = candidate; break }
        }
      }
      const selectedServices = secondService ? [firstService, secondService] : [firstService]
      const durationTotal = selectedServices.reduce((a, s) => a + Number(s.duration), 0)
      const priceTotal = selectedServices.reduce((a, s) => a + Number(s.price), 0)

      const start = addMinutes(baseStart, i * 90)
      const end = addMinutes(start, durationTotal || 60)

      // равномерно раскидываем статусы с небольшим приоритетом на NEW/CONFIRMED в будущем и COMPLETED в прошлом
      let status = pickOne(statuses)
      if (start > new Date()) {
        status = pickOne(['NEW', 'CONFIRMED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_SALON'])
      } else {
        status = pickOne(['COMPLETED', 'NO_SHOW', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_SALON'])
      }

      const booking = await prisma.booking.create({
        data: {
          bookingNumber: buildBookingNumber(seq++),
          startTime: start,
          endTime: end,
          totalPrice: priceTotal,
          status,
          teamId: team.id,
          clientId: client.id,
          masterId: master.id,
          services: {
            create: selectedServices.map(s => ({ serviceId: s.id, price: s.price }))
          }
        }
      })

      created++
      if (created % 250 === 0) {
        console.log(`Создано ${created} броней...`)
      }

      if (created >= targetCount) break // ограничение объема
    }
    if (created >= targetCount) break
  }

  console.log(`Готово. Создано бронирований: ${created}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


