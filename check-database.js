const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Проверяем базу данных...\n');
  
  try {
    // Проверяем размер файла базы
    const stats = fs.statSync('prisma/dev.db');
    console.log(`📁 Размер базы данных: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📅 Дата изменения: ${stats.mtime}\n`);
    
    // Проверяем команды/салоны
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { users: true, masters: true, services: true, bookings: true }
        }
      }
    });
    console.log(`🏢 Команды/салоны (${teams.length}):`);
    teams.forEach(team => {
      console.log(`  - ${team.name} (slug: ${team.slug})`);
      console.log(`    Пользователи: ${team._count.users}, Мастера: ${team._count.masters}, Услуги: ${team._count.services}, Брони: ${team._count.bookings}`);
    });
    
    // Проверяем пользователей
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, teamId: true }
    });
    console.log(`\n👥 Пользователи (${users.length}):`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - teamId: ${user.teamId}`);
    });
    
    // Проверяем мастеров
    const masters = await prisma.master.findMany({
      include: {
        user: { select: { email: true } },
        _count: { select: { services: true, bookings: true } }
      }
    });
    console.log(`\n👨‍💼 Мастера (${masters.length}):`);
    masters.forEach(master => {
      console.log(`  - ${master.firstName} ${master.lastName} (${master.user.email}) - teamId: ${master.teamId}`);
      console.log(`    Услуги: ${master._count.services}, Брони: ${master._count.bookings}, Активен: ${master.isActive}`);
    });
    
    // Проверяем услуги
    const services = await prisma.service.findMany({
      include: {
        _count: { select: { masters: true, bookings: true } }
      }
    });
    console.log(`\n💇‍♀️ Услуги (${services.length}):`);
    services.forEach(service => {
      console.log(`  - ${service.name} (${service.price}₽, ${service.duration}мин) - teamId: ${service.teamId}`);
      console.log(`    Мастера: ${service._count.masters}, Брони: ${service._count.bookings}, Архивна: ${service.isArchived}`);
    });
    
    console.log('\n✅ Диагностика завершена');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке базы:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
