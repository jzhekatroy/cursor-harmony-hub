# 🐳 Beauty Booking MVP - Установка в Docker

## 📋 Предварительные требования

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git** (для клонирования проекта)

### Установка Docker

#### На Ubuntu/Debian:
```bash
# Обновляем систему
sudo apt update

# Устанавливаем Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавляем пользователя в группу docker
sudo usermod -aG docker $USER

# Устанавливаем Docker Compose
sudo apt install docker-compose-plugin

# Перезагружаемся или перелогиниваемся
newgrp docker
```

#### На CentOS/RHEL:
```bash
sudo yum update -y
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### На macOS:
```bash
# Устанавливаем Docker Desktop
brew install --cask docker

# Или скачиваем с официального сайта:
# https://www.docker.com/products/docker-desktop
```

## 🚀 Быстрый запуск (рекомендуется)

### 1. Клонирование проекта
```bash
git clone https://github.com/your-repo/beauty-booking-mvp.git
cd beauty-booking-mvp
```

### 2. Запуск одной командой
```bash
# Собираем и запускаем все сервисы
docker-compose up -d

# Инициализируем базу данных
./docker-init.sh
```

### 3. Готово! 🎉
Приложение доступно по адресу: **http://localhost:3000**

## 🔧 Подробная установка

### 1. Подготовка файлов

#### Создайте структуру проекта:
```bash
mkdir beauty-booking-mvp
cd beauty-booking-mvp
```

#### Скопируйте все файлы проекта:
- `Dockerfile`
- `docker-compose.yml`
- `nginx.conf`
- `package.json`
- `src/` (папка с исходным кодом)
- `prisma/` (схема базы данных)

### 2. Настройка переменных окружения

#### Отредактируйте `docker-compose.yml`:
```yaml
environment:
  # Измените на ваш домен
  - NEXTAUTH_URL=https://your-domain.com
  - APP_URL=https://your-domain.com
  
  # Измените секретные ключи
  - NEXTAUTH_SECRET=your-unique-secret-key-here
  - JWT_SECRET=your-unique-jwt-secret-here
  
  # Настройте супер-админа
  - SUPER_ADMIN_EMAIL=admin@your-domain.com
  - SUPER_ADMIN_PASSWORD=your-secure-password
```

### 3. Сборка и запуск

#### Сборка образа:
```bash
# Собираем Docker образ
docker-compose build

# Или принудительная пересборка
docker-compose build --no-cache
```

#### Запуск контейнеров:
```bash
# Запуск в фоновом режиме
docker-compose up -d

# Запуск с логами (для отладки)
docker-compose up
```

#### Инициализация базы данных:
```bash
# Создаем таблицы
docker exec beauty-booking-app npx prisma db push

# Заполняем тестовыми данными
docker exec beauty-booking-app npm run db:seed
```

## 📊 Управление контейнерами

### Основные команды:
```bash
# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f beauty-booking

# Остановка
docker-compose stop

# Полная остановка и удаление
docker-compose down

# Перезапуск
docker-compose restart

# Обновление после изменений кода
docker-compose up -d --build
```

### Работа с базой данных:
```bash
# Подключение к контейнеру
docker exec -it beauty-booking-app sh

# Просмотр базы данных
docker exec beauty-booking-app npx prisma studio

# Сброс базы данных
docker exec beauty-booking-app npm run db:reset

# Бэкап базы данных
docker cp beauty-booking-app:/app/data/prod.db ./backup-$(date +%Y%m%d).db
```

## 🌐 Настройка для продакшена

### 1. С доменным именем

#### Обновите `docker-compose.yml`:
```yaml
environment:
  - NEXTAUTH_URL=https://yourdomain.com
  - APP_URL=https://yourdomain.com
```

#### Обновите `nginx.conf`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL сертификаты
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_private_key /etc/nginx/ssl/privkey.pem;
    
    # ... остальная конфигурация
}
```

### 2. SSL сертификаты

#### С Let's Encrypt:
```bash
# Создаем директорию для сертификатов
mkdir ssl

# Получаем сертификат
docker run --rm -v $(pwd)/ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d yourdomain.com -d www.yourdomain.com

# Копируем сертификаты
cp ssl/live/yourdomain.com/fullchain.pem ssl/
cp ssl/live/yourdomain.com/privkey.pem ssl/
```

### 3. Автоматические обновления

#### Создайте `update.sh`:
```bash
#!/bin/bash
echo "🔄 Обновление Beauty Booking..."

# Останавливаем контейнеры
docker-compose down

# Обновляем код
git pull

# Пересобираем и запускаем
docker-compose up -d --build

echo "✅ Обновление завершено!"
```

#### Настройте cron:
```bash
# Добавляем в crontab
0 2 * * 0 /path/to/beauty-booking/update.sh >> /var/log/beauty-booking-update.log 2>&1
```

## 🔍 Мониторинг и отладка

### Health Check:
```bash
# Проверка состояния
curl http://localhost:3000/api/health

# Ответ при успехе:
{
  "status": "healthy",
  "timestamp": "2025-08-05T10:30:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Логи:
```bash
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs beauty-booking

# Логи в реальном времени
docker-compose logs -f

# Последние 100 строк
docker-compose logs --tail=100
```

### Мониторинг ресурсов:
```bash
# Использование ресурсов
docker stats

# Размер образов
docker images

# Использование дисков
docker system df
```

## 🛠️ Развертывание на VPS/облаке

### 1. Подготовка сервера:
```bash
# Подключаемся по SSH
ssh root@your-server-ip

# Устанавливаем Docker
curl -fsSL https://get.docker.com | sh

# Клонируем проект
git clone https://github.com/your-repo/beauty-booking-mvp.git
cd beauty-booking-mvp
```

### 2. Настройка файрвола:
```bash
# Открываем необходимые порты
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable
```

### 3. Запуск:
```bash
# Настраиваем переменные окружения
nano docker-compose.yml

# Запускаем
docker-compose up -d

# Инициализируем
./docker-init.sh
```

## 📈 Масштабирование

### Горизонтальное масштабирование:
```yaml
# В docker-compose.yml
services:
  beauty-booking:
    # ... 
    deploy:
      replicas: 3
    
  # Добавляем балансировщик нагрузки
  load-balancer:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - beauty-booking
```

### С PostgreSQL (вместо SQLite):
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: beauty_booking
      POSTGRES_USER: beauty_booking
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  beauty-booking:
    environment:
      - DATABASE_URL=postgresql://beauty_booking:secure_password@postgres:5432/beauty_booking
```

## 🎯 Готовые конфигурации

### Для разработки:
```bash
# Запуск с hot reload
docker-compose -f docker-compose.dev.yml up
```

### Для продакшена:
```bash
# Запуск с оптимизациями
docker-compose -f docker-compose.prod.yml up -d
```

### Для тестирования:
```bash
# Запуск тестовой среды
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 🎉 Результат

После успешного запуска у вас будет:

✅ **Полностью рабочее приложение** в Docker контейнере  
✅ **Автоматические перезапуски** при сбоях  
✅ **Изолированная среда** со всеми зависимостями  
✅ **Простое масштабирование** и развертывание  
✅ **Мониторинг состояния** через health checks  
✅ **Персистентное хранение** данных в volumes  

**Приложение доступно по адресу: http://localhost:3000** 🚀