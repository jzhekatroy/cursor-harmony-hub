const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixDatabase() {
  try {
    console.log('🔧 Исправляем схему базы данных...')
    
    // Проверяем существование таблицы global_notification_settings
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'global_notification_settings'
      );
    `
    
    console.log('📊 Таблица global_notification_settings существует:', tableExists[0].exists)
    
    if (tableExists[0].exists) {
      // Проверяем существование колонки max_requests_per_minute
      const columnExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'global_notification_settings'
          AND column_name = 'max_requests_per_minute'
        );
      `
      
      console.log('📊 Колонка max_requests_per_minute существует:', columnExists[0].exists)
      
      if (!columnExists[0].exists) {
        console.log('➕ Добавляем недостающие колонки...')
        
        // Добавляем недостающие колонки
        await prisma.$queryRaw`
          ALTER TABLE global_notification_settings 
          ADD COLUMN IF NOT EXISTS max_requests_per_minute INTEGER DEFAULT 60,
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `
        
        console.log('✅ Колонки добавлены успешно!')
      }
      
      // Проверяем наличие записей
      const settings = await prisma.globalNotificationSettings.findFirst()
      
      if (!settings) {
        console.log('➕ Создаем дефолтные настройки...')
        
        await prisma.globalNotificationSettings.create({
          data: {
            max_requests_per_minute: 60,
            updated_at: new Date()
          }
        })
        
        console.log('✅ Дефолтные настройки созданы!')
      }
    }
    
    console.log('🎉 База данных исправлена успешно!')
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении базы:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabase()
