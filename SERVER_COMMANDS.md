# 📋 Команды управления сервером Beauty Booking

## 🔌 Подключение к серверу

```bash
# Подключение по SSH
ssh root@test.2minutes.ru

# Переход в директорию проекта
cd /home/beautyapp/beauty-booking
```

## 📊 Просмотр логов

### Логи приложения:
```bash
# Просмотр текущих логов (real-time)
tail -f nohup.out

# Последние 50 строк логов
tail -50 nohup.out

# Поиск ошибок в логах
grep -i error nohup.out | tail -10

# Все логи за сегодня
grep "$(date +%Y-%m-%d)" nohup.out
```

### Системные логи:
```bash
# Логи через journalctl
sudo journalctl -f | grep -i "beauty\|node\|error"

# Логи приложения если запущено как сервис
sudo journalctl -u beauty-booking -n 50 -f
```

### Логи веб-сервера (Nginx):
```bash
# Логи доступа
sudo tail -f /var/log/nginx/access.log

# Логи ошибок
sudo tail -f /var/log/nginx/error.log
```

## 🔍 Диагностика приложения

### Проверка процессов:
```bash
# Найти процессы приложения
ps aux | grep node
ps aux | grep npm

# Проверить что слушает порт 3000
netstat -punta | grep 3000
lsof -i :3000

# Количество запущенных процессов
pgrep -f "npm start" | wc -l
```

### Проверка статуса:
```bash
# Быстрая проверка API
curl http://localhost:3000/api/status
curl http://localhost:3000/api/health

# Детальная диагностика
curl http://localhost:3000/api/debug

# Проверка с внешнего IP
curl http://test.2minutes.ru/api/status
```

### Проверка базы данных:
```bash
# Размер базы данных
ls -lh prisma/dev.db

# Подключение к базе
sqlite3 prisma/dev.db

# Количество пользователей
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"

# Последние записи
sqlite3 prisma/dev.db "SELECT * FROM User ORDER BY createdAt DESC LIMIT 5;"
```

## 🔄 Управление приложением

### Перезапуск приложения:
```bash
# Полный перезапуск (рекомендуется)
./scripts/force-fix.sh

# Быстрый перезапуск
./restart-app.sh

# Принудительное освобождение порта 3000
./scripts/kill-port-3000.sh

# Ручной перезапуск
sudo pkill -f "npm start"
sudo -u beautyapp nohup npm start > nohup.out 2>&1 &
```

### Остановка приложения:
```bash
# Мягкая остановка
sudo pkill -f "npm start"

# Принудительная остановка
sudo pkill -9 -f "npm start"
sudo pkill -9 -f "node"

# Освобождение порта 3000
sudo fuser -k 3000/tcp
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Запуск приложения:
```bash
# Запуск в фоне
sudo -u beautyapp nohup npm start > nohup.out 2>&1 &

# Запуск в режиме разработки
sudo -u beautyapp npm run dev

# Проверка что запустилось
sleep 5 && curl http://localhost:3000/api/status
```

## 🚀 Деплой и обновление

### Автоматический деплой (GitHub Actions):
```bash
# Запуск через GitHub:
# 1. Перейти на https://github.com/jzhekatroy/beauty-booking-mvp/actions
# 2. Выбрать "Deploy to Server"
# 3. Нажать "Run workflow"

# Экстренное исправление:
# 1. Перейти на https://github.com/jzhekatroy/beauty-booking-mvp/actions  
# 2. Выбрать "🚨 Emergency Server Fix"
# 3. Выбрать действие: kill-port / full-restart / force-fix
# 4. Нажать "Run workflow"
```

### Ручной деплой:
```bash
# Полное обновление с GitHub
git fetch origin
git reset --hard origin/main
npm ci
sudo -u beautyapp npm run build
./scripts/force-fix.sh

# Только обновление кода
git pull origin main
sudo -u beautyapp npm run build
./restart-app.sh

# Быстрое обновление без сборки
git pull origin main
./scripts/kill-port-3000.sh
sudo -u beautyapp nohup npm start > nohup.out 2>&1 &
```

### Откат к предыдущей версии:
```bash
# Посмотреть последние коммиты
git log --oneline -5

# Откатиться к конкретному коммиту
git reset --hard COMMIT_HASH
sudo -u beautyapp npm run build
./restart-app.sh
```

## 🛡️ Управление базой данных

### Резервные копии:
```bash
# Создать резервную копию
./scripts/protect-database.sh

# Список всех резервных копий
ls -la /home/beautyapp/db-backups/

# Восстановить последнюю копию
/home/beautyapp/db-backups/restore-latest.sh

# Ручная резервная копия
cp prisma/dev.db /home/beautyapp/manual-backup-$(date +%Y%m%d_%H%M%S).db
```

### Исправление проблем с базой:
```bash
# Исправить права доступа
./scripts/fix-database-permissions.sh

# Обновить схему без потери данных
npx prisma db push

# Заполнить недостающие данные
npm run db:seed
```

### Сброс базы данных (ОСТОРОЖНО!):
```bash
# Заблокированный сброс (безопасно)
./scripts/reset-database.sh

# Принудительный сброс (удаляет ВСЕ данные!)
./scripts/reset-database.sh --force-delete-all-data
```

## 🔧 Системное администрирование

### Управление пользователями:
```bash
# Проверить под каким пользователем запущено приложение
ps aux | grep npm

# Переключиться на пользователя beautyapp
sudo -u beautyapp bash

# Исправить права на файлы
sudo chown -R beautyapp:beautyapp /home/beautyapp/beauty-booking
sudo chmod 664 /home/beautyapp/beauty-booking/prisma/dev.db
```

### Управление зависимостями:
```bash
# Переустановить зависимости
rm -rf node_modules package-lock.json
npm ci

# Обновить зависимости
npm update

# Очистить кэш
rm -rf .next
npm cache clean --force
```

### Управление окружением:
```bash
# Проверить переменные окружения
cat .env

# Пересоздать .env файл
./setup-env.sh

# Изменить режим на production
echo "NODE_ENV=production" >> .env
```

## 🚨 Экстренные ситуации

### "Внутренняя ошибка сервера":
```bash
# 1. Проверить процессы на порту 3000
netstat -punta | grep 3000

# 2. Убить зависший процесс
sudo kill -9 PID_ПРОЦЕССА

# 3. Перезапустить приложение
./restart-app.sh

# 4. Проверить логи
tail -20 nohup.out
```

### Приложение не запускается:
```bash
# 1. Проверить базу данных
ls -la prisma/dev.db
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"

# 2. Исправить права
./scripts/fix-database-permissions.sh

# 3. Пересоздать .env
./setup-env.sh

# 4. Переустановить зависимости  
rm -rf node_modules && npm ci

# 5. Пересобрать проект
sudo -u beautyapp npm run build
```

### База данных повреждена:
```bash
# 1. Восстановить из резервной копии
/home/beautyapp/db-backups/restore-latest.sh

# 2. Если резервных копий нет - пересоздать
./scripts/reset-database.sh --force-delete-all-data
```

### Сервер не отвечает:
```bash
# 1. Проверить место на диске
df -h

# 2. Проверить память
free -h

# 3. Проверить процессы
top | head -20

# 4. Перезапустить Nginx
sudo systemctl restart nginx

# 5. Полный перезапуск приложения
./scripts/force-fix.sh
```

## 📝 Полезные алиасы

Добавить в `~/.bashrc` для удобства:

```bash
# Алиасы для Beauty Booking
alias bb-logs='cd /home/beautyapp/beauty-booking && tail -f nohup.out'
alias bb-restart='cd /home/beautyapp/beauty-booking && ./restart-app.sh'
alias bb-status='cd /home/beautyapp/beauty-booking && curl -s http://localhost:3000/api/status'
alias bb-processes='ps aux | grep -E "(npm|node)" | grep -v grep'
alias bb-port='netstat -punta | grep 3000'
alias bb-backup='cd /home/beautyapp/beauty-booking && ./scripts/protect-database.sh'
alias bb-fix='cd /home/beautyapp/beauty-booking && ./scripts/force-fix.sh'
alias bb-deploy='cd /home/beautyapp/beauty-booking && git pull && npm run build && ./restart-app.sh'
```

После добавления выполнить:
```bash
source ~/.bashrc
```

## 🌐 Полезные ссылки

### Страницы приложения:
- **Главная**: http://test.2minutes.ru/
- **Вход**: http://test.2minutes.ru/login  
- **Админка**: http://test.2minutes.ru/admin
- **Публичная запись**: http://test.2minutes.ru/book/beauty-salon

### API endpoints:
- **Статус**: http://test.2minutes.ru/api/status
- **Диагностика**: http://test.2minutes.ru/api/debug  
- **Здоровье**: http://test.2minutes.ru/api/health

### GitHub:
- **Репозиторий**: https://github.com/jzhekatroy/beauty-booking-mvp
- **Actions (деплой)**: https://github.com/jzhekatroy/beauty-booking-mvp/actions

### Тестовые аккаунты:
- **Супер-админ**: admin@beauty-booking.com / admin123
- **Админ салона**: salon@example.com / password123  
- **Мастера**: anna@example.com, elena@example.com / password123

---

## 📞 Поддержка

Если ничего не помогает:
1. Создать issue в GitHub репозитории  
2. Приложить логи: `tail -50 nohup.out`
3. Указать последние действия которые выполнялись
4. Описать ожидаемое и фактическое поведение