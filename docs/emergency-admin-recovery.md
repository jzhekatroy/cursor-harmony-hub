# Экстренное восстановление доступа к админке

## Проблема
Если вы потеряли доступ к админке (нет суперадмина), используйте эти команды для восстановления.

## Решение

### 1. Создать суперадмина
```bash
# Создать нового суперадмина
docker compose exec beauty-booking node scripts/create-super-admin.js admin@example.com password123
```

### 2. Назначить роль существующему пользователю
```bash
# Если пользователь уже существует
docker compose exec beauty-booking node scripts/assign-super-admin.js user@example.com
```

### 3. Запустить полное заполнение базы (если база пустая)
```bash
# Создать тестовые данные + суперадмина
docker compose exec beauty-booking npx prisma db seed
```

## Данные для входа
- **Email**: admin@beauty-booking.com (из seed)
- **Пароль**: admin123 (из seed)
- **URL**: http://localhost:3000/login

## Проверка
После создания суперадмина проверьте:
```bash
# Проверить пользователей в базе
docker compose exec postgres psql -U postgres -d beauty -c "SELECT email, role FROM users WHERE role = 'SUPER_ADMIN';"
```
