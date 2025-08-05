#!/bin/bash

# Скрипт настройки окружения для beauty-booking
echo "🔧 Настройка окружения beauty-booking..."

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cat > .env << EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-$(date +%s)"
NODE_ENV="development"
EOF
    echo "✅ .env файл создан"
else
    echo "📁 .env файл уже существует"
fi

# Проверяем существование базы данных
if [ ! -f prisma/dev.db ]; then
    echo "🗄️ Создаем базу данных..."
    npx prisma db push
    
    echo "🌱 Заполняем базу данных тестовыми данными..."
    npm run db:seed
    
    echo "✅ База данных настроена"
else
    echo "🗄️ База данных существует. Проверяем права доступа..."
    
    # Исправляем права доступа к базе данных
    chmod 664 prisma/dev.db 2>/dev/null || echo "Права доступа уже корректны"
    
    # Проверяем, нужно ли обновить схему
    echo "🔄 Проверяем актуальность схемы базы данных..."
    if ! npx prisma db push 2>/dev/null; then
        echo "⚠️ Проблемы с базой данных. Пересоздаем..."
        rm -f prisma/dev.db
        npx prisma db push
        npm run db:seed
        echo "✅ База данных пересоздана"
    fi
fi

echo "🎉 Настройка окружения завершена!"
echo ""
echo "🔗 Тестовые аккаунты:"
echo "   - Супер-админ: admin@beauty-booking.com / admin123"
echo "   - Админ салона: salon@example.com / password123"
echo "   - Мастера: anna@example.com, elena@example.com / password123"
echo ""
echo "🌐 Ссылки:"
echo "   - Вход: http://test.2minutes.ru/login"
echo "   - Админка: http://test.2minutes.ru/admin"
echo "   - Запись: http://test.2minutes.ru/book/beauty-salon"