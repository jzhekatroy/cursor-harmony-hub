#!/bin/bash

echo "🛡️ Защита базы данных от удаления..."

DB_FILE="/home/beautyapp/beauty-booking/prisma/dev.db"
BACKUP_DIR="/home/beautyapp/db-backups"

# Создаем директорию для резервных копий
mkdir -p "$BACKUP_DIR"

# Если база существует, создаем резервную копию
if [ -f "$DB_FILE" ]; then
    BACKUP_NAME="dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Создаем резервную копию: $BACKUP_NAME"
    cp "$DB_FILE" "$BACKUP_DIR/$BACKUP_NAME"
    
    # Оставляем только последние 10 резервных копий
    cd "$BACKUP_DIR"
    ls -t dev.db.backup.* 2>/dev/null | tail -n +11 | xargs -r rm --
    
    echo "✅ Резервная копия создана: $BACKUP_DIR/$BACKUP_NAME"
    echo "📊 Всего резервных копий: $(ls -1 dev.db.backup.* 2>/dev/null | wc -l)"
else
    echo "⚠️ База данных не найдена: $DB_FILE"
fi

# Убеждаемся что база имеет правильные права доступа
if [ -f "$DB_FILE" ]; then
    echo "🔧 Исправляем права доступа к базе данных..."
    sudo chown beautyapp:beautyapp "$DB_FILE"
    sudo chmod 664 "$DB_FILE"
    echo "✅ Права доступа исправлены"
fi

# Создаем функцию восстановления базы
cat > "$BACKUP_DIR/restore-latest.sh" << 'EOF'
#!/bin/bash
echo "🔄 Восстановление последней резервной копии..."

BACKUP_DIR="/home/beautyapp/db-backups"
DB_FILE="/home/beautyapp/beauty-booking/prisma/dev.db"

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/dev.db.backup.* 2>/dev/null | head -1)

if [ ! -z "$LATEST_BACKUP" ]; then
    echo "📥 Восстанавливаем из: $LATEST_BACKUP"
    cp "$LATEST_BACKUP" "$DB_FILE"
    sudo chown beautyapp:beautyapp "$DB_FILE"
    sudo chmod 664 "$DB_FILE"
    echo "✅ База данных восстановлена!"
else
    echo "❌ Резервные копии не найдены!"
    exit 1
fi
EOF

chmod +x "$BACKUP_DIR/restore-latest.sh"

echo "🎉 Защита базы данных настроена!"
echo ""
echo "📋 Доступные команды:"
echo "   - Создать бэкап: $0"
echo "   - Восстановить: $BACKUP_DIR/restore-latest.sh"
echo "   - Список бэкапов: ls -la $BACKUP_DIR/"

exit 0