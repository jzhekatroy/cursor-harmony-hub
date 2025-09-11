const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const email = process.argv[2] || 'melkiy63@yandex.ru';
    const password = process.argv[3] || 'rootpasswd';
    
    console.log(`🔧 Создаем суперадмина: ${email}`);
    
    // Создаем системную команду если не существует
    const systemTeam = await prisma.team.upsert({
      where: { teamNumber: 'B0000001' },
      update: {},
      create: {
        id: 'system-team-001',
        teamNumber: 'B0000001',
        name: 'Система управления',
        slug: 'system',
        contactPerson: 'Супер Админ',
        email: 'admin@beauty-booking.com',
        masterLimit: 0,
      },
    });
    
    console.log(`✅ Системная команда: ${systemTeam.id}`);
    
    // Хешируем пароль
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Создаем/обновляем пользователя
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        teamId: systemTeam.id,
      },
      create: {
        id: `user-${Date.now()}`,
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
        teamId: systemTeam.id,
      },
    });
    
    console.log(`✅ Суперадмин ${email} создан/обновлен`);
    console.log(`🔑 Данные для входа:`);
    console.log(`   Email: ${email}`);
    console.log(`   Пароль: ${password}`);
    console.log(`   URL: http://localhost:3000/login`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
