const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateServerDatabase() {
  try {
    console.log('🔧 Обновляем базу данных на сервере...')
    
    // Обновляем CREATED на NEW в таблице bookings
    const updatedBookings = await prisma.$executeRaw`
      UPDATE bookings 
      SET status = 'NEW' 
      WHERE status = 'CREATED'
    `
    
    console.log(`✅ Обновлено ${updatedBookings} бронирований с CREATED на NEW`)
    
    // Обновляем CANCELLED_BY_STAFF на CANCELLED_BY_SALON в таблице bookings
    const updatedCancelled = await prisma.$executeRaw`
      UPDATE bookings 
      SET status = 'CANCELLED_BY_SALON' 
      WHERE status = 'CANCELLED_BY_STAFF'
    `
    
    console.log(`✅ Обновлено ${updatedCancelled} бронирований с CANCELLED_BY_STAFF на CANCELLED_BY_SALON`)
    
    // Обновляем записи в booking_logs
    const updatedLogs = await prisma.$executeRaw`
      UPDATE booking_logs 
      SET action = 'NEW' 
      WHERE action = 'CREATED'
    `
    
    console.log(`✅ Обновлено ${updatedLogs} записей в логах с CREATED на NEW`)
    
    const updatedLogsCancelled = await prisma.$executeRaw`
      UPDATE booking_logs 
      SET action = 'CANCELLED_BY_SALON' 
      WHERE action = 'CANCELLED_BY_STAFF'
    `
    
    console.log(`✅ Обновлено ${updatedLogsCancelled} записей в логах с CANCELLED_BY_STAFF на CANCELLED_BY_SALON`)
    
    // Проверяем результат
    const bookingStatuses = await prisma.$queryRaw`SELECT DISTINCT status FROM bookings`
    console.log('📋 Текущие статусы бронирований:', bookingStatuses)
    
    const logActions = await prisma.$queryRaw`SELECT DISTINCT action FROM booking_logs`
    console.log('📋 Текущие действия в логах:', logActions)
    
    console.log('🎉 Обновление базы данных завершено!')
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении базы данных:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateServerDatabase()
