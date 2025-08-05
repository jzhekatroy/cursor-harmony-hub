#!/bin/bash

# Скрипт настройки окружения для beauty-booking
echo "🔧 Настройка окружения beauty-booking..."

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cat > .env << EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-$(date +%s)"
NODE_ENV="production"
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
    echo "🗄️ База данных уже существует"
    
    # Проверяем, нужно ли обновить схему
    echo "🔄 Проверяем актуальность схемы базы данных..."
    npx prisma db push
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