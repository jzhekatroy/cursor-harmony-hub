#!/bin/bash

# Скрипт для создания суперадмина через Docker
# Использование: ./scripts/create-super-admin-docker.sh email@example.com password123

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ]; then
    echo "❌ Укажите email: ./scripts/create-super-admin-docker.sh email@example.com password123"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo "❌ Укажите пароль: ./scripts/create-super-admin-docker.sh email@example.com password123"
    exit 1
fi

echo "🔧 Создаем суперадмина: $EMAIL"

# Запускаем скрипт через Docker контейнер
docker compose exec beauty-booking node scripts/create-super-admin.js "$EMAIL" "$PASSWORD"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Суперадмин создан успешно!"
    echo "🔑 Данные для входа:"
    echo "   Email: $EMAIL"
    echo "   Пароль: $PASSWORD"
    echo "   URL: http://localhost:3000/login"
else
    echo "❌ Ошибка создания суперадмина"
    exit 1
fi
