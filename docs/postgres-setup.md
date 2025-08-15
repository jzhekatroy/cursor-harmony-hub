### PostgreSQL — запуск в Docker и подключение Prisma

#### 1) Запуск Postgres (Docker)
В проект уже добавлен сервис `postgres` в `docker-compose.yml`.

Команды:
```bash
docker compose up -d postgres
docker compose logs -f postgres
```

По умолчанию:
- Пользователь: `postgres`
- Пароль: `postgres`
- База: `beauty`
- Порт: `5432`

#### 2) Переменные окружения
Пример строки подключения (локально):
```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/beauty?schema=public"
```

В production через docker‑compose можно использовать хост `postgres`:
```
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/beauty?schema=public"
```

#### 3) Prisma
Генерация клиента и миграции:
```bash
npx prisma generate
npx prisma migrate dev      # для разработки
# или
npx prisma migrate deploy   # для сервера/production
```

#### 4) Переключение с SQLite
- Обновите `prisma/schema.prisma` на `provider = "postgresql"` (согласуйте перед применением).
- Примените миграции в Postgres.
- Проверьте приложение с новой БД.

#### 5) Перенос данных (SQLite → Postgres)
Будет добавлен отдельный скрипт миграции, который:
- Подключается к SQLite и Postgres одновременно.
- Копирует данные в порядке: `teams → users → masters → services → clients → bookings → booking_services → logs`.
- Сохраняет исходные `id` и связи, обрабатывает уникальные индексы и типы `Decimal/DateTime`.


