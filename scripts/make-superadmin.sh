#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Использование: $0 <email> [пароль]${NC}"
    echo -e "${YELLOW}Пример: $0 melkiy63@yandex.ru rootpasswd${NC}"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    PASSWORD="rootpasswd"
    echo -e "${YELLOW}Пароль не указан, используем: $PASSWORD${NC}"
fi

echo -e "${BLUE}🔧 Создаем суперадмина: $EMAIL${NC}"
echo -e "${YELLOW}Пароль: $PASSWORD${NC}"
echo ""

# Проверяем Docker Compose
echo -e "${BLUE}📋 Проверяем Docker Compose...${NC}"
if ! docker compose ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose не работает! Пожалуйста, запустите его.${NC}"
    exit 1
fi

# Проверяем статус контейнеров
echo -e "${BLUE}📊 Проверяем статус контейнеров...${NC}"
docker compose ps

# Находим любую существующую команду или создаем системную
echo -e "${BLUE}📝 Находим команду для суперадмина...${NC}"
TEAM_ID=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT id FROM teams LIMIT 1;" | tr -d ' \n')

if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" = "" ]; then
    echo -e "${BLUE}📝 Создаем системную команду...${NC}"
    docker compose exec postgres psql -U postgres -d beauty -c "
    INSERT INTO teams (id, \"teamNumber\", name, slug, \"contactPerson\", email, \"masterLimit\", \"createdAt\", \"updatedAt\")
    VALUES ('system-team-001', 'B0000001', 'Система управления', 'system', 'Супер Админ', 'admin@beauty-booking.com', 0, NOW(), NOW());
    "
    TEAM_ID="system-team-001"
fi

echo -e "${GREEN}✅ ID команды: $TEAM_ID${NC}"

# Генерируем хеш пароля
echo -e "${BLUE}🔐 Генерируем хеш пароля...${NC}"
HASHED_PASSWORD=$(docker compose exec beauty-booking node -e "
const bcrypt = require('bcryptjs');
const password = '$PASSWORD';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
")

# Создаем или обновляем пользователя
echo -e "${BLUE}👤 Создаем/обновляем пользователя...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO users (id, email, password, role, \"firstName\", \"lastName\", \"teamId\", \"createdAt\", \"updatedAt\")
VALUES (
    'superadmin-' || EXTRACT(EPOCH FROM NOW())::bigint,
    '$EMAIL',
    '$HASHED_PASSWORD',
    'SUPER_ADMIN',
    'Супер',
    'Админ',
    '$TEAM_ID',
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
    password = '$HASHED_PASSWORD',
    role = 'SUPER_ADMIN',
    \"teamId\" = '$TEAM_ID',
    \"updatedAt\" = NOW();
"

# Проверяем результат
echo -e "${BLUE}✅ Проверяем результат...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
SELECT 
    id,
    email,
    role,
    \"firstName\",
    \"lastName\",
    \"teamId\"
FROM users 
WHERE email = '$EMAIL';
"

echo -e "${GREEN}🎉 Готово!${NC}"
echo -e "${YELLOW}Теперь вы можете войти:${NC}"
echo -e "${YELLOW}   Email: $EMAIL${NC}"
echo -e "${YELLOW}   Пароль: $PASSWORD${NC}"
echo -e "${YELLOW}   URL: https://test.2minutes.ru/login${NC}"
