#!/usr/bin/env node
/*
  Usage:
    node scripts/assign-super-admin.js user@example.com

  Назначает пользователю роль SUPER_ADMIN.
*/

const { PrismaClient } = require('@prisma/client')

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Укажите email: node scripts/assign-super-admin.js user@example.com')
    process.exit(1)
  }
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.error(`Пользователь с email ${email} не найден`)
      process.exit(1)
    }
    if (user.role === 'SUPER_ADMIN') {
      console.log('Пользователь уже SUPER_ADMIN')
      process.exit(0)
    }
    await prisma.user.update({ where: { email }, data: { role: 'SUPER_ADMIN' } })
    console.log(`Роль SUPER_ADMIN назначена пользователю ${email}`)
  } catch (e) {
    console.error('Ошибка назначения роли:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()


