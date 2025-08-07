# Обновление базы данных на сервере

## Проблема
После обновления enum значений `BookingStatus` и `ActionType` в схеме Prisma, в базе данных остались записи со старыми значениями, что вызывает ошибки 500.

## Решение

### 1. Подключитесь к серверу
```bash
ssh user@your-server
cd /path/to/beauty-booking-mvp
```

### 2. Остановите приложение
```bash
pm2 stop beauty-booking
# или
npm run build && npm start
```

### 3. Обновите базу данных
```bash
# Обновите схему Prisma
npx prisma db push

# Запустите скрипт обновления данных
node scripts/update-server-db.js

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

## Что делает скрипт update-server-db.js

1. Обновляет все записи `CREATED` на `NEW` в таблице `bookings`
2. Обновляет все записи `CANCELLED_BY_STAFF` на `CANCELLED_BY_SALON` в таблице `bookings`
3. Обновляет соответствующие записи в таблице `booking_logs`
4. Выводит статистику обновленных записей

## Проверка результата

После выполнения скрипта в базе данных должны остаться только новые значения enum:
- `NEW`, `CONFIRMED`, `COMPLETED`, `CANCELLED_BY_CLIENT`, `CANCELLED_BY_SALON`, `NO_SHOW`
