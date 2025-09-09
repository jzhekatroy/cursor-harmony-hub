#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const prisma = new PrismaClient()

async function fixSuperAdminAuth() {
  try {
    console.log('🔧 Исправляем авторизацию суперадмина...')
    
    // Проверяем JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret || jwtSecret === 'your-super-secret-jwt-key-here') {
      console.error('❌ JWT_SECRET не настроен правильно!')
      process.exit(1)
    }
    
    console.log('✅ JWT_SECRET настроен правильно')
    
    // Находим или создаем системную команду
    let systemTeam = await prisma.team.findFirst({
      where: { teamNumber: 'B0000001' }
    })
    
    if (!systemTeam) {
      console.log('📝 Создаем системную команду...')
      systemTeam = await prisma.team.create({
        data: {
          teamNumber: 'B0000001',
          name: 'Система управления',
          slug: 'system',
          contactPerson: 'Супер Админ',
          email: 'admin@beauty-booking.com',
          masterLimit: 0,
        }
      })
      console.log('✅ Системная команда создана')
    } else {
      console.log('✅ Системная команда найдена')
    }
    
    // Находим или создаем суперадмина
    let superAdmin = await prisma.user.findFirst({
      where: { 
        email: 'melkiy63@yandex.ru',
        role: 'SUPER_ADMIN'
      }
    })
    
    if (!superAdmin) {
      console.log('📝 Создаем суперадмина...')
      const hashedPassword = await bcrypt.hash('rootpasswd', 10)
      
      superAdmin = await prisma.user.create({
        data: {
          email: 'melkiy63@yandex.ru',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          firstName: 'Super',
          lastName: 'Admin',
          teamId: systemTeam.id,
        }
      })
      console.log('✅ Суперадмин создан')
    } else {
      console.log('✅ Суперадмин найден')
    }
    
    // Генерируем новый токен
    const token = jwt.sign(
      {
        userId: superAdmin.id,
        email: superAdmin.email,
        role: superAdmin.role,
        teamId: superAdmin.teamId
      },
      jwtSecret,
      { expiresIn: '7d' }
    )
    
    console.log('🔑 Новый токен сгенерирован')
    console.log('📋 Данные для входа:')
    console.log('   Email: melkiy63@yandex.ru')
    console.log('   Пароль: rootpasswd')
    console.log('   Токен:', token)
    console.log('')
    console.log('🌐 URL для входа: http://localhost:3000/login')
    console.log('')
    console.log('💡 Если проблема сохраняется, очистите localStorage в браузере и войдите заново')
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSuperAdminAuth()
