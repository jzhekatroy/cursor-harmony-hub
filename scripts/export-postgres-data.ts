import { PrismaClient } from '@prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function main() {
  const outDir = join(process.cwd(), 'tmp')
  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true })
  }

  // Читаем данные из PostgreSQL через Prisma
  const teams = await prisma.team.findMany()
  const users = await prisma.user.findMany()
  const masters = await prisma.master.findMany()
  const masterSchedules = await prisma.masterSchedule.findMany()
  const masterAbsences = await prisma.masterAbsence.findMany()
  const serviceGroups = await prisma.serviceGroup.findMany()
  const servicesRaw = await prisma.service.findMany()
  const clients = await prisma.client.findMany()
  const clientEvents = await prisma.clientEvent.findMany()
  const bookingsRaw = await prisma.booking.findMany()
  const bookingServicesRaw = await prisma.bookingService.findMany()
  const bookingLogs = await prisma.bookingLog.findMany()
  const teamLogs = await prisma.teamLog.findMany()
  const masterRotations = await prisma.masterRotation.findMany()
  const webhooks = await prisma.webhook.findMany()

  // Приводим Decimal к строкам
  const services = servicesRaw.map((s: any) => ({ ...s, price: s.price.toString() }))
  const bookings = bookingsRaw.map((b: any) => ({ ...b, totalPrice: b.totalPrice.toString() }))
  const bookingServices = bookingServicesRaw.map((bs: any) => ({ ...bs, price: bs.price.toString() }))

  const payload = {
    exportedAt: new Date().toISOString(),
    teams,
    users,
    masters,
    masterSchedules,
    masterAbsences,
    serviceGroups,
    services,
    clients,
    clientEvents,
    bookings,
    bookingServices,
    bookingLogs,
    teamLogs,
    masterRotations,
    webhooks,
  }

  const outPath = join(outDir, 'export.json')
  await writeFile(outPath, JSON.stringify(payload), 'utf8')
  console.log(`✔ Exported PostgreSQL data to ${outPath}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })


