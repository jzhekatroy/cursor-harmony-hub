#!/bin/bash

# Простой скрипт для исправления суперадмина
# Работает как локально - через Node.js с правильными зависимостями

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры
EMAIL=${1:-"melkiy63@yandex.ru"}
PASSWORD=${2:-"rootpasswd"}

echo -e "${BLUE}🔧 Простое исправление суперадмина${NC}"
echo -e "${YELLOW}Email: $EMAIL${NC}"
echo -e "${YELLOW}Пароль: $PASSWORD${NC}"
echo ""

# 1. Останавливаем контейнеры
echo -e "${BLUE}🛑 Останавливаем контейнеры...${NC}"
docker compose down

# 2. Обновляем .env файл
echo -e "${BLUE}📝 Обновляем .env файл...${NC}"
# Удаляем старые JWT_SECRET строки
sed -i '/JWT_SECRET/d' .env
# Добавляем новый JWT_SECRET
echo 'JWT_SECRET="your-jwt-secret-for-production-2024"' >> .env
echo -e "${GREEN}✅ JWT_SECRET обновлен${NC}"

# 3. Запускаем контейнеры
echo -e "${BLUE}🚀 Запускаем контейнеры...${NC}"
docker compose up -d

# 4. Ждем запуска
echo -e "${BLUE}⏳ Ждем запуска базы данных...${NC}"
sleep 15

# 5. Проверяем статус
echo -e "${BLUE}📊 Проверяем статус контейнеров...${NC}"
docker compose ps

# 6. Создаем суперадмина через Node.js скрипт
echo -e "${BLUE}🔐 Создаем суперадмина...${NC}"

# Создаем временный Node.js скрипт
cat > temp-create-superadmin.js << 'EOF'
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
EOF

# Запускаем скрипт
docker compose exec beauty-booking node temp-create-superadmin.js "$EMAIL" "$PASSWORD"

# Удаляем временный файл
rm -f temp-create-superadmin.js

# 7. Перезапускаем приложение
echo -e "${BLUE}🔄 Перезапускаем приложение...${NC}"
docker compose restart beauty-booking

# 8. Финальная проверка
echo -e "${BLUE}📊 Финальная проверка...${NC}"
sleep 10
docker compose ps

echo -e "${GREEN}✅ Готово!${NC}"
echo -e "${YELLOW}Проверьте: https://test.2minutes.ru/login${NC}"
