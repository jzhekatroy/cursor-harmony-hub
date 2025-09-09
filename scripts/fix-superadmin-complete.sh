#!/bin/bash

# Скрипт для полного исправления проблемы с суперадмином
# Обновляет JWT_SECRET, перезапускает сервис и создает пользователя

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
JWT_SECRET=${3:-"your-new-strong-secret-key-here"}

echo -e "${BLUE}🔧 Полное исправление суперадмина${NC}"
echo -e "${YELLOW}Email: $EMAIL${NC}"
echo -e "${YELLOW}Пароль: $PASSWORD${NC}"
echo -e "${YELLOW}JWT_SECRET: $JWT_SECRET${NC}"
echo ""

# Проверяем, что Docker Compose работает
echo -e "${BLUE}📋 Проверяем Docker Compose...${NC}"
if ! docker compose ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose не работает!${NC}"
    exit 1
fi

# Останавливаем контейнеры
echo -e "${BLUE}🛑 Останавливаем контейнеры...${NC}"
docker compose down

# Обновляем .env файл
echo -e "${BLUE}📝 Обновляем .env файл...${NC}"
if [ -f .env ]; then
    # Удаляем старый JWT_SECRET
    sed -i '/^JWT_SECRET=/d' .env
    # Добавляем новый JWT_SECRET
    echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env
    echo -e "${GREEN}✅ JWT_SECRET обновлен в .env${NC}"
else
    echo -e "${RED}❌ Файл .env не найден!${NC}"
    exit 1
fi

# Запускаем контейнеры
echo -e "${BLUE}🚀 Запускаем контейнеры...${NC}"
docker compose up -d

# Ждем запуска базы данных
echo -e "${BLUE}⏳ Ждем запуска базы данных...${NC}"
sleep 10

# Проверяем, что контейнеры запущены
echo -e "${BLUE}🔍 Проверяем статус контейнеров...${NC}"
docker compose ps

# Создаем системную команду если не существует
echo -e "${BLUE}🏢 Создаем системную команду...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO teams (id, \"teamNumber\", name, slug, \"contactPerson\", email, \"masterLimit\", \"createdAt\", \"updatedAt\")
SELECT 'system-team-001', 'B0000001', 'Система управления', 'system', 'Супер Админ', 'admin@beauty-booking.com', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE \"teamNumber\" = 'B0000001');
"

# Получаем ID системной команды
echo -e "${BLUE}📝 Получаем ID системной команды...${NC}"
TEAM_ID=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT id FROM teams WHERE \"teamNumber\" = 'B0000001' LIMIT 1;" | tr -d ' \n')
echo -e "${GREEN}✅ ID системной команды: $TEAM_ID${NC}"

# Генерируем хеш пароля
echo -e "${BLUE}🔐 Генерируем хеш пароля...${NC}"
HASHED_PASSWORD=$(docker compose exec beauty-booking node -e "
const bcrypt = require('bcryptjs');
const password = '$PASSWORD';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
")

# Создаем пользователя
echo -e "${BLUE}👤 Создаем/обновляем пользователя...${NC}"
USER_ID="superadmin-$(date +%s)"
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO users (id, email, password, role, \"firstName\", \"lastName\", \"teamId\", \"createdAt\", \"updatedAt\") 
VALUES (
  '$USER_ID', 
  '$EMAIL', 
  '$HASHED_PASSWORD', 
  'SUPER_ADMIN',
  'Super',
  'Admin',
  '$TEAM_ID',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET 
  role = 'SUPER_ADMIN',
  password = '$HASHED_PASSWORD',
  \"updatedAt\" = NOW();
"

# Проверяем создание пользователя
echo -e "${BLUE}🔍 Проверяем создание пользователя...${NC}"
USER_CHECK=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT email, role FROM users WHERE email = '$EMAIL';" | tr -d ' \n')
echo -e "${GREEN}✅ Пользователь: $USER_CHECK${NC}"

# Перезапускаем приложение для применения JWT_SECRET
echo -e "${BLUE}🔄 Перезапускаем приложение...${NC}"
docker compose restart beauty-booking

# Ждем запуска приложения
echo -e "${BLUE}⏳ Ждем запуска приложения...${NC}"
sleep 15

# Проверяем статус
echo -e "${BLUE}📊 Проверяем статус сервисов...${NC}"
docker compose ps

echo ""
echo -e "${GREEN}🎉 Исправление завершено!${NC}"
echo -e "${YELLOW}🔑 Данные для входа:${NC}"
echo -e "   Email: $EMAIL"
echo -e "   Пароль: $PASSWORD"
echo -e "   URL: https://test.2minutes.ru/login"
echo ""
echo -e "${BLUE}📋 Проверьте разделы:${NC}"
echo -e "   • https://test.2minutes.ru/superadmin/error-logs"
echo -e "   • https://test.2minutes.ru/superadmin/booking-logs"
echo -e "   • https://test.2minutes.ru/db-viewer"
echo ""
echo -e "${GREEN}✅ Готово!${NC}"
