# 🔧 Исправление авторизации на сервере

## 🚨 Проблема
Все API суперадмина возвращают 403 Forbidden из-за неправильного JWT_SECRET.

## ✅ Решение

### 1. Обновить JWT_SECRET на сервере

```bash
# Подключиться к серверу
ssh root@test.2minutes.ru

# Перейти в директорию проекта
cd /home/beautyapp/beauty-booking

# Обновить код
git pull

# Создать новый JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=\"$JWT_SECRET\"" > .env.new

# Обновить .env файл
cat .env | grep -v JWT_SECRET > .env.tmp
echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env.tmp
mv .env.tmp .env

# Также обновить NEXTAUTH_SECRET
NEXTAUTH_SECRET="$JWT_SECRET"
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"/" .env

echo "✅ JWT_SECRET обновлен: $JWT_SECRET"
```

### 2. Исправить авторизацию суперадмина

```bash
# Запустить скрипт исправления
node scripts/fix-superadmin-auth.js
```

### 3. Перезапустить приложение

```bash
# Остановить контейнеры
docker compose down

# Запустить заново
docker compose up -d

# Проверить логи
docker compose logs -f beauty-booking
```

### 4. Проверить работу

1. Открыть https://test.2minutes.ru/login
2. Войти с данными:
   - Email: `melkiy63@yandex.ru`
   - Пароль: `rootpasswd`
3. Проверить доступ к разделам суперадмина

## 🔍 Диагностика

Если проблема сохраняется:

```bash
# Проверить переменные окружения в контейнере
docker compose exec beauty-booking env | grep JWT

# Проверить логи авторизации
docker compose logs beauty-booking | grep -i "token\|auth\|403"

# Проверить базу данных
docker compose exec postgres psql -U postgres -d beauty -c "SELECT email, role FROM users WHERE role = 'SUPER_ADMIN';"
```

## 📋 Альтернативное решение

Если скрипт не работает, можно исправить вручную:

```bash
# Войти в контейнер
docker compose exec beauty-booking bash

# Запустить Node.js
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function fix() {
  const user = await prisma.user.findFirst({
    where: { email: 'melkiy63@yandex.ru' }
  });
  
  if (user) {
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, teamId: user.teamId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Token:', token);
  }
  
  await prisma.\$disconnect();
}

fix();
"
```
