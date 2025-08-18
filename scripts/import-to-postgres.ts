import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'

type ExportPayload = {
  teams: any[]
  users: any[]
  masters: any[]
  masterSchedules: any[]
  masterAbsences: any[]
  serviceGroups: any[]
  services: any[]
  clients: any[]
  clientEvents: any[]
  bookings: any[]
  bookingServices: any[]
  bookingLogs: any[]
  teamLogs: any[]
  masterRotations: any[]
  webhooks: any[]
}

const prisma = new PrismaClient()

async function insertMany<Model>(table: string, fn: (batch: any[]) => Promise<any>, rows: Model[], batchSize = 1000) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize)
    if (slice.length === 0) continue
    await fn(slice as any)
    console.log(`  → ${table}: +${slice.length} (total ${Math.min(i + batchSize, rows.length)}/${rows.length})`)
  }
}

async function main() {
  const filePath = join(process.cwd(), 'tmp', 'export.json')
  const raw = await readFile(filePath, 'utf8')
  const data = JSON.parse(raw) as ExportPayload

  console.log('Starting import to Postgres...')

  // Очистка целевой базы (на свой страх и риск)
  // Порядок удаления обратный зависимостям
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE 
    booking_logs, booking_services, bookings, 
    client_events, clients, 
    master_absences, master_schedules, masters, 
    services, service_groups, 
    team_logs, master_rotations, 
    webhooks, users, teams 
    RESTART IDENTITY CASCADE`)

  // Вставка согласно зависимостям
  await insertMany('teams', (rows) => prisma.team.createMany({ data: rows, skipDuplicates: true }), data.teams)
  await insertMany('users', (rows) => prisma.user.createMany({ data: rows, skipDuplicates: true }), data.users)
  await insertMany('masters', (rows) => prisma.master.createMany({ data: rows, skipDuplicates: true }), data.masters)
  await insertMany('service_groups', (rows) => prisma.serviceGroup.createMany({ data: rows, skipDuplicates: true }), data.serviceGroups)
  await insertMany('services', (rows) => prisma.service.createMany({ data: rows, skipDuplicates: true }), data.services)
  await insertMany('clients', (rows) => prisma.client.createMany({ data: rows, skipDuplicates: true }), data.clients)
  await insertMany('bookings', (rows) => prisma.booking.createMany({ data: rows, skipDuplicates: true }), data.bookings)
  await insertMany('booking_services', (rows) => prisma.bookingService.createMany({ data: rows, skipDuplicates: true }), data.bookingServices)
  await insertMany('booking_logs', (rows) => prisma.bookingLog.createMany({ data: rows, skipDuplicates: true }), data.bookingLogs)
  await insertMany('client_events', (rows) => (prisma as any).clientEvent.createMany({ data: rows, skipDuplicates: true }), data.clientEvents)
  await insertMany('master_schedules', (rows) => prisma.masterSchedule.createMany({ data: rows, skipDuplicates: true }), data.masterSchedules)
  await insertMany('master_absences', (rows) => prisma.masterAbsence.createMany({ data: rows, skipDuplicates: true }), data.masterAbsences)
  await insertMany('master_rotations', (rows) => (prisma as any).masterRotation.createMany({ data: rows, skipDuplicates: true }), data.masterRotations)
  await insertMany('team_logs', (rows) => prisma.teamLog.createMany({ data: rows, skipDuplicates: true }), data.teamLogs)
  await insertMany('webhooks', (rows) => prisma.webhook.createMany({ data: rows, skipDuplicates: true }), data.webhooks)

  console.log('✔ Import finished')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })


