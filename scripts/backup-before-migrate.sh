#!/bin/bash

# Создание бэкапа перед миграциями
# Использование: ./scripts/backup-before-migrate.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_before_migrate_$TIMESTAMP.sql"

echo "💾 Создание бэкапа перед миграциями..."

# Создаем директорию для бэкапов
mkdir -p "$BACKUP_DIR"

# Создаем бэкап базы данных
echo "📦 Создаем бэкап: $BACKUP_FILE"

# Для SQLite (локальная разработка)
if [ -f "prisma/dev.db" ]; then
    echo "🗄️  SQLite база обнаружена"
    cp prisma/dev.db "$BACKUP_DIR/dev_backup_$TIMESTAMP.db"
    echo "✅ SQLite бэкап создан: $BACKUP_DIR/dev_backup_$TIMESTAMP.db"
fi

# Для PostgreSQL (продакшен)
if [ ! -z "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "🐘 PostgreSQL база обнаружена"
    
    # Извлекаем параметры подключения из DATABASE_URL
    DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
    if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        
        # Создаем бэкап через pg_dump
        PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✅ PostgreSQL бэкап создан: $BACKUP_FILE"
        else
            echo "❌ Ошибка создания PostgreSQL бэкапа"
            exit 1
        fi
    fi
fi

echo ""
echo "📋 Информация о бэкапе:"
echo "   📁 Директория: $BACKUP_DIR"
echo "   📄 Файл: $(basename $BACKUP_FILE)"
echo "   📅 Время: $(date)"
echo "   💾 Размер: $(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1 || echo 'N/A')"

echo ""
echo "🔄 Теперь можно безопасно запускать миграции:"
echo "   ./scripts/safe-migrate.sh"
echo ""
echo "🔄 Или восстановить из бэкапа при необходимости:"
echo "   ./scripts/restore-from-backup.sh $BACKUP_FILE"
