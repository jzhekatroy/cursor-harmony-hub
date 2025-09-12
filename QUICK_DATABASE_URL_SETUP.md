# 🚨 СРОЧНО: Настройка DATABASE_URL

## Проблема
GitHub Actions не может найти `DATABASE_URL` и выдает ошибку:
```
Error: You must provide a nonempty URL. The environment variable `DATABASE_URL` resolved to an empty string.
```

## Решение

### 1. Зайдите в настройки репозитория
- Откройте: https://github.com/jzhekatroy/beauty-booking-mvp/settings/secrets/actions
- Нажмите **"New repository secret"**

### 2. Добавьте секрет DATABASE_URL
- **Name:** `DATABASE_URL`
- **Value:** `postgresql://beauty_user:your_password@test.2minutes.ru:5432/beauty?schema=public`

### 3. Добавьте остальные секреты
- **Name:** `HOST` → **Value:** `test.2minutes.ru`
- **Name:** `USERNAME` → **Value:** `root`
- **Name:** `SSH_KEY` → **Value:** (приватный SSH ключ с сервера)

## Как получить правильный DATABASE_URL

### На сервере test.2minutes.ru:
```bash
# Подключитесь к серверу
ssh root@test.2minutes.ru

# Проверьте настройки базы данных
cd /home/beautyapp/beauty-booking
cat .env | grep DATABASE_URL
```

### Или создайте новый:
```bash
# На сервере
sudo -u postgres psql
CREATE DATABASE beauty;
CREATE USER beauty_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE beauty TO beauty_user;
\q
```

### Формат DATABASE_URL:
```
postgresql://beauty_user:your_password@test.2minutes.ru:5432/beauty?schema=public
```

## Проверка

После добавления всех секретов:
1. Сделайте любой коммит
2. Запушьте в main
3. Проверьте Actions - ошибка должна исчезнуть

## Готово! ✅

После настройки `DATABASE_URL` деплой будет работать автоматически!
