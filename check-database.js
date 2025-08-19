const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('🔍 Проверяем базу данных (PostgreSQL)...\n')

  try {
    // Проверяем подключение к БД
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Подключение к БД установлено')
    console.log(`🌐 DATABASE_URL: ${process.env.DATABASE_URL || 'не задан'}`)

    // Проверяем команды/салоны
    const teams = await prisma.team.findMany({
      include: {
        _count: { select: { users: true, masters: true, services: true, bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    console.log(`\n🏢 Команды/салоны (первые ${teams.length}):`)
    for (const team of teams) {
      console.log(`  - ${team.name} (teamNumber: ${team.teamNumber}, slug: ${team.slug})`)
      console.log(`    Пользователи: ${team._count.users}, Мастера: ${team._count.masters}, Услуги: ${team._count.services}, Брони: ${team._count.bookings}`)
    }

    // Проверяем пользователей
    const usersCount = await prisma.user.count()
    console.log(`\n👥 Пользователи: ${usersCount}`)

    // Проверяем мастеров
    const mastersCount = await prisma.master.count()
    console.log(`👨‍💼 Мастера: ${mastersCount}`)

    // Проверяем услуги
    const servicesCount = await prisma.service.count()
    console.log(`💇‍♀️ Услуги: ${servicesCount}`)

    console.log('\n✅ Диагностика завершена')
  } catch (error) {
    console.error('❌ Ошибка при проверке базы:', error?.message || error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
