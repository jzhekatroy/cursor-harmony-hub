#!/bin/bash

# Простой скрипт для создания суперадмина
# Использование: ./scripts/create-superadmin-simple.sh email@example.com password123

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ]; then
    echo "❌ Укажите email: ./scripts/create-superadmin-simple.sh email@example.com password123"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo "❌ Укажите пароль: ./scripts/create-superadmin-simple.sh email@example.com password123"
    exit 1
fi

echo "🔧 Создаем суперадмина: $EMAIL"

# Генерируем ID
USER_ID="admin-$(date +%s)"

# Создаем системную команду если не существует
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO teams (id, \"teamNumber\", name, slug, \"contactPerson\", email, \"masterLimit\", \"createdAt\", \"updatedAt\")
SELECT 'system-team-001', 'B0000001', 'Система управления', 'system', 'Супер Админ', 'admin@beauty-booking.com', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE \"teamNumber\" = 'B0000001');
"

# Получаем ID системной команды
TEAM_ID=$(docker compose exec postgres psql -U postgres -d beauty -t -c "SELECT id FROM teams WHERE \"teamNumber\" = 'B0000001' LIMIT 1;" | tr -d ' \n')

echo "📝 ID системной команды: $TEAM_ID"

# Создаем пользователя
docker compose exec postgres psql -U postgres -d beauty -c "
INSERT INTO users (id, email, password, role, \"firstName\", \"lastName\", \"teamId\", \"createdAt\", \"updatedAt\") 
VALUES (
  '$USER_ID', 
  '$EMAIL', 
  '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'SUPER_ADMIN',
  'Super',
  'Admin',
  '$TEAM_ID',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET 
  role = 'SUPER_ADMIN',
  password = '\$2a\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  \"updatedAt\" = NOW();
"

if [ $? -eq 0 ]; then
    echo "✅ Суперадмин $EMAIL создан/обновлен"
    echo "🔑 Данные для входа:"
    echo "   Email: $EMAIL"
    echo "   Пароль: $PASSWORD"
    echo "   URL: http://localhost:3000/login"
    echo ""
    echo "💡 Если не работает, попробуйте пароль: password"
else
    echo "❌ Ошибка создания суперадмина"
    exit 1
fi
