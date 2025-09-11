const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function changePassword() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    console.log(`🔧 Меняем пароль для: ${email}`);
    
    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.error(`❌ Пользователь ${email} не найден!`);
      process.exit(1);
    }
    
    console.log(`✅ Пользователь найден: ${user.firstName} ${user.lastName} (${user.role})`);
    
    // Хешируем новый пароль
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Обновляем пароль
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    
    console.log(`✅ Пароль для ${email} успешно изменен!`);
    console.log(`🔑 Новые данные для входа:`);
    console.log(`   Email: ${email}`);
    console.log(`   Пароль: ${newPassword}`);
    console.log(`   URL: http://localhost:3000/login`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

changePassword();
