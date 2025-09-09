#!/bin/bash

# Скрипт для создания нового пользователя с ролью SUPER_ADMIN
# Использование: ./scripts/create-admin-user.sh email@example.com password123

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ]; then
    echo "❌ Укажите email: ./scripts/create-admin-user.sh email@example.com password123"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo "❌ Укажите пароль: ./scripts/create-admin-user.sh email@example.com password123"
    exit 1
fi

echo "🔧 Создаем нового пользователя: $EMAIL"

# Генерируем хеш пароля (используем простой способ)
HASHED_PASSWORD=$(docker compose exec beauty-booking node -e "console.log(require('bcryptjs').hashSync('$PASSWORD', 10))")

# Создаем пользователя
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO users (id, email, password, role, first_name, last_name, created_at, updated_at) 
VALUES (
  'admin-' || extract(epoch from now())::text, 
  '$EMAIL', 
  '$HASHED_PASSWORD', 
  'SUPER_ADMIN',
  'Super',
  'Admin',
  NOW(),
  NOW()
);
"

if [ $? -eq 0 ]; then
    echo "✅ Пользователь $EMAIL создан с ролью SUPER_ADMIN"
    echo "🔑 Данные для входа:"
    echo "   Email: $EMAIL"
    echo "   Пароль: $PASSWORD"
    echo "   URL: http://localhost:3000/login"
else
    echo "❌ Ошибка создания пользователя"
    exit 1
fi
