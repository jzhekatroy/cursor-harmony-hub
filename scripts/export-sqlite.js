const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const path = require('path')

// Путь к SQLite базе
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')
const outputPath = path.join(__dirname, '..', 'tmp', 'export.json')

// Создаем подключение к SQLite
const db = new sqlite3.Database(dbPath)

// Функция для выполнения запроса и получения результатов
function query(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err)
      else resolve(rows || [])
    })
  })
}

async function exportData() {
  try {
    console.log('Starting export from SQLite...')
    
    // Экспортируем данные из всех таблиц
    const teams = await query('SELECT * FROM teams')
    const users = await query('SELECT * FROM users')
    const masters = await query('SELECT * FROM masters')
    const masterSchedules = await query('SELECT * FROM master_schedules')
    const masterAbsences = await query('SELECT * FROM master_absences')
    const serviceGroups = await query('SELECT * FROM service_groups')
    const services = await query('SELECT * FROM services')
    const clients = await query('SELECT * FROM clients')
    const clientEvents = await query('SELECT * FROM client_events')
    const bookings = await query('SELECT * FROM bookings')
    const bookingServices = await query('SELECT * FROM booking_services')
    const bookingLogs = await query('SELECT * FROM booking_logs')
    const teamLogs = await query('SELECT * FROM team_logs')
    const masterRotations = await query('SELECT * FROM master_rotations')
    const webhooks = await query('SELECT * FROM webhooks')

    const exportData = {
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
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))

    console.log('✔ Export finished')
    console.log(`📁 Data saved to: ${outputPath}`)
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
    db.close()
  }
}

exportData()
