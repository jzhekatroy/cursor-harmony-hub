const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Функция для преобразования типов данных из SQLite в PostgreSQL
function transformRow(row) {
  const transformed = { ...row }
  
  // Преобразуем boolean поля из SQLite (0/1) в PostgreSQL boolean
  if ('webhooksEnabled' in transformed) {
    transformed.webhooksEnabled = Boolean(transformed.webhooksEnabled)
  }
  if ('fairMasterRotation' in transformed) {
    transformed.fairMasterRotation = Boolean(transformed.fairMasterRotation)
  }
  if ('isActive' in transformed) {
    transformed.isActive = Boolean(transformed.isActive)
  }
  if ('isArchived' in transformed) {
    transformed.isArchived = Boolean(transformed.isArchived)
  }
  if ('requireConfirmation' in transformed) {
    transformed.requireConfirmation = Boolean(transformed.requireConfirmation)
  }
  if ('isRecurring' in transformed) {
    transformed.isRecurring = Boolean(transformed.isRecurring)
  }
  
  // Преобразуем timestamp поля
  if ('createdAt' in transformed && typeof transformed.createdAt === 'number') {
    transformed.createdAt = new Date(transformed.createdAt)
  }
  if ('updatedAt' in transformed && typeof transformed.updatedAt === 'number') {
    transformed.updatedAt = new Date(transformed.updatedAt)
  }
  if ('startDate' in transformed && typeof transformed.startDate === 'number') {
    transformed.startDate = new Date(transformed.startDate)
  }
  if ('endDate' in transformed && typeof transformed.endDate === 'number') {
    transformed.endDate = new Date(transformed.endDate)
  }
  if ('lastLoginAt' in transformed && typeof transformed.lastLoginAt === 'number') {
    transformed.lastLoginAt = new Date(transformed.lastLoginAt)
  }
  if ('date' in transformed && typeof transformed.date === 'number') {
    transformed.date = new Date(transformed.date)
  }
  if ('startTime' in transformed && typeof transformed.startTime === 'number') {
    transformed.startTime = new Date(transformed.startTime)
  }
  if ('endTime' in transformed && typeof transformed.endTime === 'number') {
    transformed.endTime = new Date(transformed.endTime)
  }
  if ('lastShownAt' in transformed && typeof transformed.lastShownAt === 'number') {
    transformed.lastShownAt = new Date(transformed.lastShownAt)
  }
  
  return transformed
}

async function insertMany(table, fn, rows, batchSize = 1000) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize)
    if (slice.length === 0) continue
    
    // Преобразуем типы данных для PostgreSQL
    const transformedSlice = slice.map(transformRow)
    
    await fn(transformedSlice)
    console.log(`  → ${table}: +${slice.length} (total ${Math.min(i + batchSize, rows.length)}/${rows.length})`)
  }
}

async function main() {
  const filePath = path.join(__dirname, '..', 'tmp', 'export.json')
  const raw = await fs.promises.readFile(filePath, 'utf8')
  const data = JSON.parse(raw)

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
  await insertMany('teams', (rows) => prisma.team.createMany({ data: rows }), data.teams)
  await insertMany('users', (rows) => prisma.user.createMany({ data: rows }), data.users)
  await insertMany('masters', (rows) => prisma.master.createMany({ data: rows }), data.masters)
  await insertMany('service_groups', (rows) => prisma.serviceGroup.createMany({ data: rows }), data.serviceGroups)
  await insertMany('services', (rows) => prisma.service.createMany({ data: rows }), data.services)
  await insertMany('clients', (rows) => prisma.client.createMany({ data: rows }), data.clients)
  await insertMany('bookings', (rows) => prisma.booking.createMany({ data: rows }), data.bookings)
  await insertMany('booking_services', (rows) => prisma.bookingService.createMany({ data: rows }), data.bookingServices)
  await insertMany('booking_logs', (rows) => prisma.bookingLog.createMany({ data: rows }), data.bookingLogs)
  await insertMany('client_events', (rows) => prisma.clientEvent.createMany({ data: rows }), data.clientEvents)
  await insertMany('master_schedules', (rows) => prisma.masterSchedule.createMany({ data: rows }), data.masterSchedules)
  await insertMany('master_absences', (rows) => prisma.masterAbsence.createMany({ data: rows }), data.masterAbsences)
  await insertMany('master_rotations', (rows) => prisma.masterRotation.createMany({ data: rows }), data.masterRotations)
  await insertMany('team_logs', (rows) => prisma.teamLog.createMany({ data: rows }), data.teamLogs)
  await insertMany('webhooks', (rows) => prisma.webhook.createMany({ data: rows }), data.webhooks)

  console.log('✔ Import finished')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
