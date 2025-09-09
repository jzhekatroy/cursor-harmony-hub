#!/bin/bash

# SQL скрипт для создания суперадмина
# Использование: ./scripts/create-super-admin-sql.sh email@example.com password123

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ]; then
    echo "❌ Укажите email: ./scripts/create-super-admin-sql.sh email@example.com password123"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo "❌ Укажите пароль: ./scripts/create-super-admin-sql.sh email@example.com password123"
    exit 1
fi

echo "🔧 Создаем суперадмина через SQL: $EMAIL"

# Хешируем пароль (bcrypt)
HASHED_PASSWORD=$(docker compose exec beauty-booking node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$PASSWORD', 10))")

# Создаем пользователя через SQL
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO users (id, email, password, role, first_name, last_name, created_at, updated_at) 
VALUES (
  'admin-$(date +%s)', 
  '$EMAIL', 
  '$HASHED_PASSWORD',
  'SUPER_ADMIN',
  'Super',
  'Admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET 
  role = 'SUPER_ADMIN',
  password = '$HASHED_PASSWORD',
  updated_at = NOW();
"

if [ $? -eq 0 ]; then
    echo "✅ Суперадмин создан успешно!"
    echo "🔑 Данные для входа:"
    echo "   Email: $EMAIL"
    echo "   Пароль: $PASSWORD"
    echo "   URL: http://localhost:3000/login"
else
    echo "❌ Ошибка создания суперадмина"
    exit 1
fi
