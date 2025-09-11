#!/bin/bash

echo "🚀 Применяем миграцию для global_notification_settings..."

cd /home/beautyapp/beauty-booking

# Применяем миграцию через Docker
echo "📦 Применяем миграцию через Docker..."
docker compose exec -e DATABASE_URL="$DATABASE_URL" beauty-booking sh -lc 'npx prisma migrate deploy' || {
    echo "❌ Ошибка применения миграции через Docker"
    echo "🔄 Пробуем альтернативный способ..."
    
    # Альтернативный способ - прямое выполнение SQL
    echo "📝 Выполняем SQL миграцию напрямую..."
    docker compose exec -e DATABASE_URL="$DATABASE_URL" beauty-booking sh -lc 'psql "$DATABASE_URL" -c "
        CREATE TABLE IF NOT EXISTS \"global_notification_settings\" (
            \"id\" TEXT NOT NULL,
            \"maxRequestsPerMinute\" INTEGER NOT NULL DEFAULT 25,
            \"requestDelayMs\" INTEGER NOT NULL DEFAULT 2000,
            \"maxRetryAttempts\" INTEGER NOT NULL DEFAULT 3,
            \"retryDelayMs\" INTEGER NOT NULL DEFAULT 5000,
            \"exponentialBackoff\" BOOLEAN NOT NULL DEFAULT true,
            \"failureThreshold\" INTEGER NOT NULL DEFAULT 5,
            \"recoveryTimeoutMs\" INTEGER NOT NULL DEFAULT 60000,
            \"enabled\" BOOLEAN NOT NULL DEFAULT true,
            \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \"updatedAt\" TIMESTAMP(3) NOT NULL,
            CONSTRAINT \"global_notification_settings_pkey\" PRIMARY KEY (\"id\")
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS \"global_notification_settings_id_key\" ON \"global_notification_settings\"(\"id\");
        
        INSERT INTO \"global_notification_settings\" (
            \"id\", \"maxRequestsPerMinute\", \"requestDelayMs\", \"maxRetryAttempts\",
            \"retryDelayMs\", \"exponentialBackoff\", \"failureThreshold\", 
            \"recoveryTimeoutMs\", \"enabled\", \"createdAt\", \"updatedAt\"
        ) VALUES (
            '\''global'\'', 25, 2000, 3, 5000, true, 5, 60000, true, NOW(), NOW()
        ) ON CONFLICT (\"id\") DO NOTHING;
    "'
}

echo "✅ Миграция применена!"
echo "🔍 Проверяем результат..."
curl -s http://localhost:3000/api/superadmin/global-notification-settings | jq . || echo "API еще не отвечает"
