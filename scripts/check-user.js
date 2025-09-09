const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const email = process.argv[2] || 'melkiy63@yandex.ru';
    
    console.log(`🔍 Проверяем пользователя: ${email}`);
    
    // Ищем пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      include: { team: true }
    });
    
    if (!user) {
      console.log('❌ Пользователь не найден!');
      return;
    }
    
    console.log('✅ Пользователь найден:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Team: ${user.team?.name} (${user.team?.teamNumber})`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Updated: ${user.updatedAt}`);
    
    // Проверяем пароль
    const testPassword = process.argv[3] || 'rootpasswd';
    const isPasswordValid = bcrypt.compareSync(testPassword, user.password);
    
    console.log(`🔐 Проверка пароля "${testPassword}": ${isPasswordValid ? '✅ Валидный' : '❌ Неверный'}`);
    
    if (!isPasswordValid) {
      console.log('💡 Попробуйте другие пароли:');
      const passwords = ['password', 'admin123', 'rootpasswd', 'melkiy63'];
      for (const pwd of passwords) {
        const isValid = bcrypt.compareSync(pwd, user.password);
        console.log(`   "${pwd}": ${isValid ? '✅' : '❌'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
