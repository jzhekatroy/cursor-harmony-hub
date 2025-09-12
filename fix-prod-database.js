#!/usr/bin/env node

/**
 * Скрипт для исправления базы данных на проде
 * Добавляет недостающую колонку max_requests_per_minute в таблицу global_notification_settings
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fixProductionDatabase() {
  try {
    console.log('🔧 Начинаем исправление базы данных на проде...');
    
    // Проверяем, существует ли таблица global_notification_settings
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'global_notification_settings'
      );
    `;
    
    console.log('📊 Таблица global_notification_settings существует:', tableExists[0].exists);
    
    if (tableExists[0].exists) {
      // Проверяем, есть ли колонка max_requests_per_minute
      const columnExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'global_notification_settings'
          AND column_name = 'max_requests_per_minute'
        );
      `;
      
      console.log('📊 Колонка max_requests_per_minute существует:', columnExists[0].exists);
      
      if (!columnExists[0].exists) {
        console.log('➕ Добавляем колонку max_requests_per_minute...');
        
        await prisma.$executeRaw`
          ALTER TABLE global_notification_settings 
          ADD COLUMN max_requests_per_minute INTEGER DEFAULT 60;
        `;
        
        console.log('✅ Колонка max_requests_per_minute добавлена');
      } else {
        console.log('✅ Колонка max_requests_per_minute уже существует');
      }
      
      // Проверяем, есть ли колонка updated_at
      const updatedAtExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'global_notification_settings'
          AND column_name = 'updated_at'
        );
      `;
      
      console.log('📊 Колонка updated_at существует:', updatedAtExists[0].exists);
      
      if (!updatedAtExists[0].exists) {
        console.log('➕ Добавляем колонку updated_at...');
        
        await prisma.$executeRaw`
          ALTER TABLE global_notification_settings 
          ADD COLUMN updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        `;
        
        console.log('✅ Колонка updated_at добавлена');
      } else {
        console.log('✅ Колонка updated_at уже существует');
      }
      
      // Создаем запись с дефолтными настройками, если её нет
      const existingSettings = await prisma.globalNotificationSettings.findFirst();
      
      if (!existingSettings) {
        console.log('➕ Создаем дефолтные настройки уведомлений...');
        
        await prisma.globalNotificationSettings.create({
          data: {
            maxRequestsPerMinute: 60,
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Дефолтные настройки созданы');
      } else {
        console.log('✅ Настройки уведомлений уже существуют');
      }
      
    } else {
      console.log('❌ Таблица global_notification_settings не существует');
      console.log('🔄 Запускаем полную миграцию...');
      
      // Запускаем миграции
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      
      console.log('✅ Миграции применены');
    }
    
    console.log('🎉 База данных на проде исправлена!');
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении базы данных:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем скрипт
fixProductionDatabase();
