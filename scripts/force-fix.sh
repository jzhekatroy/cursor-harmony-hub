#!/bin/bash

echo "🔥 Принудительное исправление серверных проблем..."

# Останавливаем все процессы Node.js/npm
echo "🛑 Останавливаем все процессы..."
sudo pkill -f "node" || true
sudo pkill -f "npm" || true
sleep 3

# Освобождаем порт 3000
echo "🔓 Освобождаем порт 3000..."
sudo fuser -k 3000/tcp || true
sleep 2

# Исправляем права доступа
echo "🔧 Исправляем права доступа..."
sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking
sudo chmod 664 /home/beautyapp/beauty-booking/prisma/dev.db || true

# Очищаем кэш
echo "🧹 Очищаем кэш..."
sudo rm -rf /home/beautyapp/beauty-booking/.next
sudo rm -rf /home/beautyapp/beauty-booking/node_modules/.cache

# Переустанавливаем зависимости если нужно
echo "📦 Проверяем зависимости..."
cd /home/beautyapp/beauty-booking
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "📥 Переустанавливаем зависимости..."
    sudo -u beautyapp npm ci
fi

# Настраиваем окружение
echo "⚙️ Настраиваем окружение..."
sudo -u beautyapp ./setup-env.sh

# Собираем проект
echo "🔨 Собираем проект..."
sudo -u beautyapp npm run build

# Запускаем приложение
echo "🚀 Запускаем приложение..."
cd /home/beautyapp/beauty-booking
sudo -u beautyapp nohup npm start > nohup.out 2>&1 &

# Ждем запуска
echo "⏳ Ждем запуска приложения..."
sleep 5

# Проверяем статус
echo "🔍 Проверяем статус..."
if pgrep -f "npm start" > /dev/null; then
    echo "✅ Приложение запущено!"
    echo "📊 Процессы: $(pgrep -f 'npm start' | wc -l)"
    
    # Проверяем доступность
    if curl -s http://localhost:3000/api/status > /dev/null; then
        echo "✅ Приложение отвечает на запросы!"
    else
        echo "⚠️ Приложение запущено, но не отвечает на запросы"
    fi
else
    echo "❌ Ошибка запуска приложения"
    echo "📋 Последние строки логов:"
    tail -10 nohup.out || echo "Логи недоступны"
    exit 1
fi

echo "🎉 Исправление завершено!"
exit 0