#!/bin/bash

echo "🐳 Инициализация Beauty Booking в Docker..."

# Ждем, пока приложение запустится
echo "⏳ Ожидание запуска приложения..."
sleep 10

# Проверяем health check
echo "🔍 Проверка состояния приложения..."
until curl -f http://localhost:3000/api/health; do
  echo "⏳ Приложение еще не готово, ждем..."
  sleep 5
done

echo "✅ Приложение запущено!"

# Инициализируем базу данных (если нужно)
echo "🗄️ Проверка базы данных..."
docker exec beauty-booking-app npx prisma db push --accept-data-loss || true
docker exec beauty-booking-app npm run db:seed || true

echo "🎉 Инициализация завершена!"
echo ""
echo "🔗 Приложение доступно по адресу:"
echo "   http://localhost:3000"
echo ""
echo "🔑 Доступы для входа:"
echo "   Супер-админ: admin@beauty-booking.com / admin123"
echo "   Админ салона: salon@example.com / password123"