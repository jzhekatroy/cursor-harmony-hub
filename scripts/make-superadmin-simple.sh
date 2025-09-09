#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

EMAIL=$1

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Использование: $0 <email>${NC}"
    echo -e "${YELLOW}Пример: $0 etryanov@gmail.com${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Делаем суперадмином: $EMAIL${NC}"
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

# Проверяем существование пользователя
echo -e "${BLUE}🔍 Проверяем пользователя...${NC}"
USER_EXISTS=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT COUNT(*) FROM users WHERE email = '$EMAIL';" | tr -d ' \n')

if [ "$USER_EXISTS" -eq 0 ]; then
    echo -e "${RED}❌ Пользователь с email '$EMAIL' не найден.${NC}"
    echo -e "${YELLOW}Сначала создайте пользователя через регистрацию.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Пользователь $EMAIL найден.${NC}"

# Находим любую команду
echo -e "${BLUE}📝 Находим команду...${NC}"
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

# Обновляем пользователя - делаем суперадмином
echo -e "${BLUE}👤 Делаем суперадмином...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
UPDATE users 
SET 
    role = 'SUPER_ADMIN',
    \"teamId\" = '$TEAM_ID',
    \"updatedAt\" = NOW()
WHERE email = '$EMAIL';
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
echo -e "${YELLOW}Пользователь $EMAIL теперь суперадмин!${NC}"
echo -e "${YELLOW}Может войти на: https://test.2minutes.ru/login${NC}"
