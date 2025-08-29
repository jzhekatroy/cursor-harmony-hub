import { PrismaClient } from '@prisma/client'
import { writeFile } from 'fs/promises'
import { join } from 'path'

// Временно меняем провайдер на SQLite для экспорта
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

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

async function main() {
  console.log('Starting export from SQLite...')

  try {
    // Экспортируем данные
    const teams = await prisma.team.findMany()
    const users = await prisma.user.findMany()
    const masters = await prisma.master.findMany()
    const masterSchedules = await prisma.masterSchedule.findMany()
    const masterAbsences = await prisma.masterAbsence.findMany()
    const serviceGroups = await prisma.serviceGroup.findMany()
    const services = await prisma.service.findMany()
    const clients = await prisma.client.findMany()
    const clientEvents = await prisma.clientEvent.findMany()
    const bookings = await prisma.booking.findMany()
    const bookingServices = await prisma.bookingService.findMany()
    const bookingLogs = await prisma.bookingLog.findMany()
    const teamLogs = await prisma.teamLog.findMany()
    const masterRotations = await prisma.masterRotation.findMany()
    const webhooks = await prisma.webhook.findMany()

    const exportData: ExportPayload = {
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
      webhooks
    }

    // Сохраняем в файл
    const filePath = join(process.cwd(), 'tmp', 'export.json')
    await writeFile(filePath, JSON.stringify(exportData, null, 2))

    console.log('✔ Export finished')
    console.log(`📁 Data saved to: ${filePath}`)
    console.log(`📊 Records exported:`)
    console.log(`  - Teams: ${teams.length}`)
    console.log(`  - Users: ${users.length}`)
    console.log(`  - Masters: ${masters.length}`)
    console.log(`  - Services: ${services.length}`)
    console.log(`  - Bookings: ${bookings.length}`)
    console.log(`  - Clients: ${clients.length}`)

  } catch (error) {
    console.error('Export failed:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
