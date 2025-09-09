#!/bin/bash

# Скрипт для назначения роли SUPER_ADMIN существующему пользователю
# Использование: ./scripts/make-super-admin.sh email@example.com

EMAIL=$1

if [ -z "$EMAIL" ]; then
    echo "❌ Укажите email: ./scripts/make-super-admin.sh email@example.com"
    exit 1
fi

echo "🔧 Назначаем роль SUPER_ADMIN пользователю: $EMAIL"

# Проверяем, существует ли пользователь
USER_EXISTS=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT COUNT(*) FROM users WHERE email = '$EMAIL';" 2>/dev/null | tr -d ' ')

if [ "$USER_EXISTS" = "0" ]; then
    echo "❌ Пользователь с email $EMAIL не найден"
    echo "💡 Сначала создайте пользователя через админку или используйте seed"
    exit 1
fi

# Назначаем роль SUPER_ADMIN
docker compose exec postgres psql -U postgres -d beauty -c "
UPDATE users 
SET role = 'SUPER_ADMIN' 
WHERE email = '$EMAIL';
"

if [ $? -eq 0 ]; then
    echo "✅ Роль SUPER_ADMIN назначена пользователю $EMAIL"
    echo "🔑 Теперь можно войти в систему:"
    echo "   Email: $EMAIL"
    echo "   URL: http://localhost:3000/login"
else
    echo "❌ Ошибка назначения роли"
    exit 1
fi
