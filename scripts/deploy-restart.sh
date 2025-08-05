#!/bin/bash

echo "🔄 Быстрый перезапуск для деплоя"
echo "==============================="

cd /home/beautyapp/beauty-booking

# Останавливаем процессы
echo "🛑 Останавливаем процессы..."
sudo pkill -f "npm start" 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true
sleep 2

# Исправляем права
echo "🔧 Исправляем права..."
sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking
chmod 664 prisma/dev.db 2>/dev/null || true

# Удаляем старую сборку
echo "🗑️ Очищаем кэш..."
rm -rf .next

# Собираем проект
echo "🔨 Собираем..."
if sudo -u beautyapp npm run build >/dev/null 2>&1; then
    echo "✅ Сборка успешна"
else
    echo "❌ Ошибка сборки"
    exit 1
fi

# Запускаем
echo "🚀 Запускаем..."
sudo -u beautyapp bash -c "cd /home/beautyapp/beauty-booking && NODE_ENV=production nohup npm start > app.log 2>&1 &" 

# Ждем и проверяем
sleep 5
npm_pid=$(pgrep -f "npm start" || echo "")
if [ ! -z "$npm_pid" ]; then
    echo "✅ Запущен (PID: $npm_pid)"
else
    echo "❌ Не запустился"
    exit 1
fi

echo "🎉 Перезапуск завершен!"
exit 0