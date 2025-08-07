# Инструкция по исправлению сервера

## Проблема
Сервер возвращает ошибку 502 Bad Gateway из-за несоответствия enum значений в базе данных.

## Решение

### 1. Подключитесь к серверу
```bash
ssh user@your-server
cd /path/to/beauty-booking-mvp
```

### 2. Остановите приложение
```bash
pm2 stop beauty-booking
# или если используете другой процесс
pkill -f "npm run"
```

### 3. Обновите базу данных
```bash
# Обновите схему Prisma
npx prisma db push

# Запустите скрипт исправления данных
node scripts/fix-server-db.js

# Перегенерируйте Prisma Client
npx prisma generate
```

### 4. Перезапустите приложение
```bash
pm2 start beauty-booking
# или
npm run build && npm start
```

### 5. Проверьте работу
Откройте админ-панель и убедитесь, что календарь загружается без ошибок.

## Что делает скрипт fix-server-db.js

1. Обновляет все записи `CREATED` на `NEW` в таблице `bookings`
2. Обновляет все записи `CANCELLED_BY_STAFF` на `CANCELLED_BY_SALON` в таблице `bookings`
3. Обновляет соответствующие записи в таблице `booking_logs`
4. Выводит статистику обновленных записей

## Альтернативное решение (если скрипт не работает)

Если скрипт не работает, можно выполнить SQL команды напрямую:

```sql
-- Обновляем статусы бронирований
UPDATE bookings SET status = 'NEW' WHERE status = 'CREATED';
UPDATE bookings SET status = 'CANCELLED_BY_SALON' WHERE status = 'CANCELLED_BY_STAFF';

-- Обновляем действия в логах
UPDATE booking_logs SET action = 'NEW' WHERE action = 'CREATED';
UPDATE booking_logs SET action = 'CANCELLED_BY_SALON' WHERE action = 'CANCELLED_BY_STAFF';
```

## Проверка результата

После выполнения в базе данных должны остаться только новые значения enum:
- `NEW`, `CONFIRMED`, `COMPLETED`, `CANCELLED_BY_CLIENT`, `CANCELLED_BY_SALON`, `NO_SHOW`
