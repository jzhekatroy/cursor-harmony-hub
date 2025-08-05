#!/bin/bash

echo "🔍 ПОЛНАЯ ДИАГНОСТИКА СЕРВЕРА beauty-booking"
echo "============================================="
echo ""

# Проверяем текущую директорию
echo "📂 Текущая директория: $(pwd)"
echo "👤 Текущий пользователь: $(whoami)"
echo ""

# Проверяем процессы
echo "🔍 Процессы на порту 3000:"
netstat -punta | grep 3000 || echo "Нет процессов на порту 3000"
echo ""

echo "🔍 Все процессы Node.js/npm:"
ps aux | grep -E "(node|npm)" | grep -v grep || echo "Нет процессов Node.js/npm"
echo ""

# Проверяем файлы проекта
echo "📁 Структура проекта:"
ls -la | head -10
echo ""

echo "📁 Права доступа на ключевые файлы:"
echo "  restart-app.sh: $(ls -la restart-app.sh 2>/dev/null || echo 'НЕ НАЙДЕН')"
echo "  setup-env.sh: $(ls -la setup-env.sh 2>/dev/null || echo 'НЕ НАЙДЕН')"
echo "  package.json: $(ls -la package.json 2>/dev/null || echo 'НЕ НАЙДЕН')"
echo "  .env: $(ls -la .env 2>/dev/null || echo 'НЕ НАЙДЕН')"
echo "  prisma/dev.db: $(ls -la prisma/dev.db 2>/dev/null || echo 'НЕ НАЙДЕН')"
echo ""

# Проверяем .env
if [ -f .env ]; then
    echo "📝 Содержимое .env:"
    cat .env | sed 's/JWT_SECRET=.*/JWT_SECRET=***HIDDEN***/'
    echo ""
else
    echo "❌ .env файл отсутствует!"
    echo ""
fi

# Проверяем базу данных
if [ -f prisma/dev.db ]; then
    echo "🗄️ База данных:"
    echo "  Размер: $(du -h prisma/dev.db | cut -f1)"
    echo "  Права: $(ls -la prisma/dev.db)"
    echo ""
    
    # Пробуем подключиться к базе
    echo "🧪 Тест подключения к базе данных:"
    if timeout 10 npx prisma db push --accept-data-loss 2>/dev/null; then
        echo "✅ База данных работает"
    else
        echo "❌ Проблемы с базой данных"
    fi
    echo ""
else
    echo "❌ База данных отсутствует!"
    echo ""
fi

# Проверяем зависимости
echo "📦 Node.js и npm:"
echo "  Node.js: $(node --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"
echo "  npm: $(npm --version 2>/dev/null || echo 'НЕ УСТАНОВЛЕН')"
echo ""

if [ -d node_modules ]; then
    echo "📦 node_modules существует (размер: $(du -sh node_modules | cut -f1))"
else
    echo "❌ node_modules отсутствует!"
fi
echo ""

# Пробуем запустить приложение в тестовом режиме
echo "🧪 Тест запуска приложения:"
echo "Попытка сборки проекта..."

if timeout 60 npm run build 2>&1 | tail -10; then
    echo "✅ Сборка прошла успешно"
    
    echo ""
    echo "🚀 Попытка запуска приложения (5 секунд)..."
    
    # Запускаем приложение в фоне на 5 секунд
    timeout 5 npm start &
    APP_PID=$!
    sleep 3
    
    # Проверяем endpoints
    echo "🔍 Тест endpoints:"
    
    if curl -f -s http://localhost:3000/api/status >/dev/null 2>&1; then
        echo "✅ /api/status - работает"
    else
        echo "❌ /api/status - не отвечает"
    fi
    
    if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ /api/health - работает"
    else
        echo "❌ /api/health - не отвечает"
    fi
    
    # Останавливаем тестовый процесс
    kill $APP_PID 2>/dev/null || true
    sleep 1
    
else
    echo "❌ Ошибка сборки проекта"
fi

echo ""
echo "📋 Логи приложения (последние 20 строк):"
if [ -f app.log ]; then
    tail -20 app.log
else
    echo "Файл app.log не найден"
fi

echo ""
echo "🎯 РЕКОМЕНДАЦИИ:"
echo "==============="

# Анализируем проблемы и даем рекомендации
if [ ! -f .env ]; then
    echo "❌ Создайте .env файл: ./setup-env.sh"
fi

if [ ! -f prisma/dev.db ]; then
    echo "❌ Создайте базу данных: npx prisma db push && npm run db:seed"
fi

if [ ! -d node_modules ]; then
    echo "❌ Установите зависимости: npm ci"
fi

# Проверяем владельца файлов
current_owner=$(ls -la . | head -2 | tail -1 | awk '{print $3}')
if [ "$current_owner" != "beautyapp" ]; then
    echo "❌ Исправьте права доступа: sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking"
fi

echo ""
echo "🔧 Команды для исправления:"
echo "sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking"
echo "cd /home/beautyapp/beauty-booking"
echo "sudo -u beautyapp ./setup-env.sh"
echo "sudo -u beautyapp npm ci"
echo "sudo -u beautyapp npm run build"
echo "sudo -u beautyapp npm start"

echo ""
echo "🎉 Диагностика завершена!"