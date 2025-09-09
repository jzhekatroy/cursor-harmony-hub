#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

EMAIL=$1
NEW_PASSWORD=$2

if [ -z "$EMAIL" ] || [ -z "$NEW_PASSWORD" ]; then
    echo -e "${RED}❌ Использование: $0 <email> <новый_пароль>${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Смена пароля для пользователя: $EMAIL${NC}"
echo -e "${YELLOW}Новый пароль: $NEW_PASSWORD${NC}"
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

# Генерируем хеш пароля через Node.js в контейнере
echo -e "${BLUE}🔐 Генерируем хеш пароля...${NC}"
HASHED_PASSWORD=$(docker compose exec beauty-booking node -e "
const bcrypt = require('bcryptjs');
const password = '$NEW_PASSWORD';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
")

if [ -z "$HASHED_PASSWORD" ]; then
    echo -e "${RED}❌ Не удалось сгенерировать хеш пароля!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Хеш пароля сгенерирован${NC}"

# Проверяем, существует ли пользователь
echo -e "${BLUE}🔍 Проверяем пользователя $EMAIL...${NC}"
USER_EXISTS=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT COUNT(*) FROM users WHERE email = '$EMAIL';" | tr -d ' \n')

if [ "$USER_EXISTS" -eq 0 ]; then
    echo -e "${RED}❌ Пользователь с email '$EMAIL' не найден.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Пользователь $EMAIL найден.${NC}"

# Обновляем пароль
echo -e "${BLUE}🔄 Обновляем пароль в базе данных...${NC}"
docker compose exec postgres psql -U postgres -d beauty -c "
UPDATE users
SET password = '$HASHED_PASSWORD', \"updatedAt\" = NOW()
WHERE email = '$EMAIL';
"

echo -e "${GREEN}✅ Пароль для пользователя $EMAIL успешно обновлен!${NC}"
echo -e "${YELLOW}Теперь вы можете войти с новым паролем:${NC}"
echo -e "${YELLOW}   Email: $EMAIL${NC}"
echo -e "${YELLOW}   Пароль: $NEW_PASSWORD${NC}"
echo -e "${YELLOW}   URL: https://test.2minutes.ru/login${NC}"
echo -e "${GREEN}🎉 Готово!${NC}"
