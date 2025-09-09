#!/bin/bash

# Скрипт для смены пароля пользователя
# Использует Node.js с правильными зависимостями

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры
EMAIL=${1}
NEW_PASSWORD=${2}

if [ -z "$EMAIL" ] || [ -z "$NEW_PASSWORD" ]; then
    echo -e "${RED}❌ Использование: $0 <email> <новый_пароль>${NC}"
    echo -e "${YELLOW}Пример: $0 melkiy63@yandex.ru newpassword123${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 Смена пароля для пользователя${NC}"
echo -e "${YELLOW}Email: $EMAIL${NC}"
echo -e "${YELLOW}Новый пароль: $NEW_PASSWORD${NC}"
echo ""

# Проверяем, что Docker Compose работает
echo -e "${BLUE}📋 Проверяем Docker Compose...${NC}"
if ! docker compose ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose не работает!${NC}"
    exit 1
fi

# Проверяем статус контейнеров
echo -e "${BLUE}📊 Проверяем статус контейнеров...${NC}"
docker compose ps

# Создаем временный Node.js скрипт для смены пароля
echo -e "${BLUE}🔐 Меняем пароль...${NC}"

# Создаем скрипт внутри контейнера
docker compose exec beauty-booking sh -c 'cat > /app/temp-change-password.js << "EOF"
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

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
    console.error("❌ Ошибка:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

changePassword();
EOF'

# Запускаем скрипт
docker compose exec beauty-booking node /app/temp-change-password.js "$EMAIL" "$NEW_PASSWORD"

# Удаляем временный файл
docker compose exec beauty-booking rm -f /app/temp-change-password.js

echo -e "${GREEN}✅ Готово!${NC}"
echo -e "${YELLOW}Проверьте: https://test.2minutes.ru/login${NC}"
