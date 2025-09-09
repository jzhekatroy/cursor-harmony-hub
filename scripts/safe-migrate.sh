#!/bin/bash

# Безопасные миграции базы данных
# Этот скрипт НЕ очищает данные, только применяет изменения схемы

echo "🔒 Безопасные миграции базы данных"
echo "⚠️  Этот скрипт НЕ очищает данные!"

# Проверяем, что мы не в продакшене
if [ "$NODE_ENV" = "production" ]; then
    echo "❌ ОШИБКА: Нельзя запускать миграции в продакшене через этот скрипт!"
    echo "💡 Используйте: npm run db:migrate:deploy"
    exit 1
fi

echo "📊 Проверяем текущее состояние базы..."

# Проверяем количество записей до миграции
BEFORE_CLIENTS=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM clients;" 2>/dev/null | grep -o '[0-9]*' | tail -1)
BEFORE_BOOKINGS=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM bookings;" 2>/dev/null | grep -o '[0-9]*' | tail -1)
BEFORE_USERS=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM users;" 2>/dev/null | grep -o '[0-9]*' | tail -1)

echo "📈 До миграции:"
echo "   👤 Клиенты: $BEFORE_CLIENTS"
echo "   📅 Бронирования: $BEFORE_BOOKINGS" 
echo "   👥 Пользователи: $BEFORE_USERS"

echo ""
echo "🔄 Применяем миграции..."

# Применяем миграции БЕЗ очистки данных
npx prisma migrate dev --name "safe_migration_$(date +%Y%m%d_%H%M%S)"

if [ $? -eq 0 ]; then
    echo "✅ Миграции применены успешно!"
    
    # Проверяем количество записей после миграции
    AFTER_CLIENTS=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM clients;" 2>/dev/null | grep -o '[0-9]*' | tail -1)
    AFTER_BOOKINGS=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM bookings;" 2>/dev/null | grep -o '[0-9]*' | tail -1)
    AFTER_USERS=$(npx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT COUNT(*) as count FROM users;" 2>/dev/null | grep -o '[0-9]*' | tail -1)
    
    echo ""
    echo "📊 После миграции:"
    echo "   👤 Клиенты: $AFTER_CLIENTS"
    echo "   📅 Бронирования: $AFTER_BOOKINGS"
    echo "   👥 Пользователи: $AFTER_USERS"
    
    if [ "$BEFORE_CLIENTS" = "$AFTER_CLIENTS" ] && [ "$BEFORE_BOOKINGS" = "$AFTER_BOOKINGS" ] && [ "$BEFORE_USERS" = "$AFTER_USERS" ]; then
        echo "✅ Данные сохранены!"
    else
        echo "⚠️  Внимание: Количество записей изменилось!"
    fi
else
    echo "❌ Ошибка при применении миграций!"
    exit 1
fi
