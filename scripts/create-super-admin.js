#!/usr/bin/env node
/*
  Usage:
    node scripts/create-super-admin.js user@example.com password123

  Создает пользователя с ролью SUPER_ADMIN.
  Если пользователь уже существует, назначает ему роль SUPER_ADMIN.
*/

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  
  if (!email) {
    console.error('Укажите email: node scripts/create-super-admin.js user@example.com password123')
    process.exit(1)
  }
  
  if (!password) {
    console.error('Укажите пароль: node scripts/create-super-admin.js user@example.com password123')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  
  try {
    // Проверяем, существует ли пользователь
    let user = await prisma.user.findUnique({ where: { email } })
    
    if (user) {
      // Пользователь существует, обновляем роль
      if (user.role === 'SUPER_ADMIN') {
        console.log('✅ Пользователь уже является SUPER_ADMIN')
        process.exit(0)
      }
      
      await prisma.user.update({ 
        where: { email }, 
        data: { 
          role: 'SUPER_ADMIN',
          password: await bcrypt.hash(password, 10)
        } 
      })
      console.log(`✅ Роль SUPER_ADMIN назначена существующему пользователю ${email}`)
    } else {
      // Пользователь не существует, создаем нового
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Находим системную команду для суперадмина
      let systemTeam = await prisma.team.findFirst({
        where: { teamNumber: 'B0000001' }
      })
      
      if (!systemTeam) {
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
      }

      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          firstName: 'Super',
          lastName: 'Admin',
          teamId: systemTeam.id,
        }
      })
      console.log(`✅ Создан новый пользователь ${email} с ролью SUPER_ADMIN`)
    }
    
    console.log(`\n🔑 Данные для входа:`)
    console.log(`   Email: ${email}`)
    console.log(`   Пароль: ${password}`)
    console.log(`   URL: http://localhost:3000/login`)
    
  } catch (e) {
    console.error('❌ Ошибка создания суперадмина:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
