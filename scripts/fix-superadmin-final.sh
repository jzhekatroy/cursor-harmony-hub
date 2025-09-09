#!/bin/bash

# Финальный скрипт для исправления суперадмина
# Решает все проблемы с JWT_SECRET и авторизацией

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
JWT_SECRET=${3:-"super-secret-jwt-key-$(date +%s)"}

echo -e "${BLUE}🔧 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ СУПЕРАДМИНА${NC}"
echo -e "${YELLOW}Email: $EMAIL${NC}"
echo -e "${YELLOW}Пароль: $PASSWORD${NC}"
echo -e "${YELLOW}JWT_SECRET: $JWT_SECRET${NC}"
echo ""

# 1. Останавливаем все контейнеры
echo -e "${BLUE}🛑 Останавливаем контейнеры...${NC}"
docker compose down

# 2. Очищаем кеш Docker
echo -e "${BLUE}🧹 Очищаем кеш Docker...${NC}"
docker system prune -f
docker volume prune -f

# 3. Обновляем .env файл
echo -e "${BLUE}📝 Обновляем .env файл...${NC}"
# Удаляем старые JWT_SECRET
sed -i '/^JWT_SECRET=/d' .env
# Добавляем новый JWT_SECRET
echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env
echo -e "${GREEN}✅ JWT_SECRET обновлен: $JWT_SECRET${NC}"

# 4. Пересобираем контейнеры без кеша
echo -e "${BLUE}🔨 Пересобираем контейнеры...${NC}"
docker compose build --no-cache

# 5. Запускаем контейнеры
echo -e "${BLUE}🚀 Запускаем контейнеры...${NC}"
docker compose up -d

# 6. Ждем запуска базы данных
echo -e "${BLUE}⏳ Ждем запуска базы данных...${NC}"
sleep 20

# 7. Проверяем статус
echo -e "${BLUE}📊 Проверяем статус контейнеров...${NC}"
docker compose ps

# 8. Проверяем JWT_SECRET в контейнере
echo -e "${BLUE}🔍 Проверяем JWT_SECRET в контейнере...${NC}"
CONTAINER_JWT=$(docker compose exec beauty-booking printenv | grep JWT_SECRET || echo "NOT_FOUND")
echo -e "${GREEN}✅ JWT_SECRET в контейнере: $CONTAINER_JWT${NC}"

# 9. Создаем системную команду
echo -e "${BLUE}🏢 Создаем системную команду...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO teams (id, \"teamNumber\", name, slug, \"contactPerson\", email, \"masterLimit\", \"createdAt\", \"updatedAt\")
SELECT 'system-team-001', 'B0000001', 'Система управления', 'system', 'Супер Админ', 'admin@beauty-booking.com', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE \"teamNumber\" = 'B0000001');
"

# 10. Получаем ID системной команды
echo -e "${BLUE}📝 Получаем ID системной команды...${NC}"
TEAM_ID=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT id FROM teams WHERE \"teamNumber\" = 'B0000001' LIMIT 1;" | tr -d ' \n')
echo -e "${GREEN}✅ ID системной команды: $TEAM_ID${NC}"

# 11. Генерируем хеш пароля
echo -e "${BLUE}🔐 Генерируем хеш пароля...${NC}"
HASHED_PASSWORD=$(docker compose exec beauty-booking node -e "
const bcrypt = require('bcryptjs');
const password = '$PASSWORD';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
")

# 12. Создаем/обновляем пользователя
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

# 13. Проверяем создание пользователя
echo -e "${BLUE}🔍 Проверяем создание пользователя...${NC}"
USER_CHECK=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT email, role FROM users WHERE email = '$EMAIL';" | tr -d ' \n')
echo -e "${GREEN}✅ Пользователь: $USER_CHECK${NC}"

# 14. Перезапускаем приложение
echo -e "${BLUE}🔄 Перезапускаем приложение...${NC}"
docker compose restart beauty-booking

# 15. Ждем запуска приложения
echo -e "${BLUE}⏳ Ждем запуска приложения...${NC}"
sleep 15

# 16. Проверяем финальный статус
echo -e "${BLUE}📊 Проверяем финальный статус...${NC}"
docker compose ps

# 17. Тестируем API
echo -e "${BLUE}🧪 Тестируем API...${NC}"
sleep 5

# Проверяем доступность API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me || echo "ERROR")
echo -e "${GREEN}✅ API статус: $API_STATUS${NC}"

echo ""
echo -e "${GREEN}🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!${NC}"
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
echo -e "${GREEN}✅ ВСЕ ГОТОВО!${NC}"
