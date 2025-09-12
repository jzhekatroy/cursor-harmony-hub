const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabaseHealth() {
  try {
    console.log('🔍 Проверяем состояние базы данных...')
    
    // 1. Проверяем подключение
    await prisma.$connect()
    console.log('✅ Подключение к базе данных успешно')
    
    // 2. Проверяем существование основных таблиц
    const tables = [
      'users',
      'teams', 
      'masters',
      'services',
      'bookings',
      'global_notification_settings'
    ]
    
    for (const table of tables) {
      try {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          );
        `
        const exists = result[0].exists
        console.log(`${exists ? '✅' : '❌'} Таблица ${table}: ${exists ? 'существует' : 'отсутствует'}`)
      } catch (error) {
        console.log(`❌ Ошибка проверки таблицы ${table}:`, error.message)
      }
    }
    
    // 3. Проверяем схему global_notification_settings
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'global_notification_settings'
        ORDER BY ordinal_position;
      `
      
      console.log('📊 Колонки в global_notification_settings:')
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`)
      })
      
      // Проверяем наличие обязательных колонок
      const requiredColumns = ['max_requests_per_minute', 'updated_at']
      const existingColumns = columns.map(col => col.column_name)
      
      for (const requiredCol of requiredColumns) {
        if (existingColumns.includes(requiredCol)) {
          console.log(`✅ Обязательная колонка ${requiredCol} присутствует`)
        } else {
          console.log(`❌ Обязательная колонка ${requiredCol} отсутствует`)
        }
      }
      
    } catch (error) {
      console.log('❌ Ошибка проверки схемы global_notification_settings:', error.message)
    }
    
    // 4. Проверяем наличие данных
    try {
      const userCount = await prisma.user.count()
      const teamCount = await prisma.team.count()
      const masterCount = await prisma.master.count()
      const serviceCount = await prisma.service.count()
      const bookingCount = await prisma.booking.count()
      
      console.log('📊 Количество записей в таблицах:')
      console.log(`  - Пользователи: ${userCount}`)
      console.log(`  - Команды: ${teamCount}`)
      console.log(`  - Мастера: ${masterCount}`)
      console.log(`  - Услуги: ${serviceCount}`)
      console.log(`  - Бронирования: ${bookingCount}`)
      
    } catch (error) {
      console.log('❌ Ошибка подсчета записей:', error.message)
    }
    
    // 5. Проверяем глобальные настройки
    try {
      const settings = await prisma.globalNotificationSettings.findFirst()
      if (settings) {
        console.log('✅ Глобальные настройки найдены')
        console.log(`  - max_requests_per_minute: ${settings.max_requests_per_minute}`)
        console.log(`  - updated_at: ${settings.updated_at}`)
      } else {
        console.log('⚠️ Глобальные настройки отсутствуют')
      }
    } catch (error) {
      console.log('❌ Ошибка проверки глобальных настроек:', error.message)
    }
    
    console.log('🎉 Проверка базы данных завершена!')
    
  } catch (error) {
    console.error('❌ Критическая ошибка при проверке базы данных:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseHealth()
