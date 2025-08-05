# 🚀 Beauty Booking MVP - Полная установка на Debian сервер

## 📋 Требования к серверу

- **ОС**: Debian 11/12 или Ubuntu 20.04/22.04
- **RAM**: минимум 1GB, рекомендуется 2GB+
- **Диск**: минимум 10GB свободного места
- **CPU**: 1 ядро (рекомендуется 2+)
- **Сеть**: публичный IP адрес
- **Доступ**: root или sudo пользователь

## 🔧 Этап 1: Подготовка сервера

### 1.1 Подключение к серверу
```bash
# Подключаемся по SSH (замените на ваш IP)
ssh root@your-server-ip

# Или если есть sudo пользователь:
ssh username@your-server-ip
```

### 1.2 Обновление системы
```bash
# Обновляем список пакетов
apt update

# Обновляем все пакеты
apt upgrade -y

# Устанавливаем базовые утилиты
apt install -y curl wget git nano htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 1.3 Настройка файрвола (UFW)
```bash
# Устанавливаем UFW если не установлен
apt install -y ufw

# Настраиваем базовые правила
ufw default deny incoming
ufw default allow outgoing

# Разрешаем SSH (ВАЖНО! Сделайте это до включения UFW)
ufw allow ssh
ufw allow 22

# Разрешаем HTTP и HTTPS
ufw allow 80
ufw allow 443

# Разрешаем порт приложения (для разработки)
ufw allow 3000

# Включаем файрвол
ufw --force enable

# Проверяем статус
ufw status
```

### 1.4 Создание пользователя для приложения (рекомендуется)
```bash
# Создаем пользователя
useradd -m -s /bin/bash beautyapp

# Добавляем в группу sudo
usermod -aG sudo beautyapp

# Устанавливаем пароль
passwd beautyapp

# Переключаемся на пользователя
su - beautyapp
```

## 🐳 Этап 2: Установка Docker (рекомендуемый способ)

### 2.1 Установка Docker
```bash
# Удаляем старые версии (если есть)
sudo apt remove -y docker docker-engine docker.io containerd runc

# Добавляем официальный GPG ключ Docker
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавляем репозиторий Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновляем список пакетов
sudo apt update

# Устанавливаем Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавляем пользователя в группу docker
sudo usermod -aG docker $USER

# Включаем автозапуск Docker
sudo systemctl enable docker
sudo systemctl start docker

# Перелогиниваемся для применения изменений группы
newgrp docker

# Проверяем установку
docker --version
docker compose version
```

### 2.2 Установка приложения через Docker
```bash
# Создаем директорию для приложения
mkdir -p /home/beautyapp/beauty-booking
cd /home/beautyapp/beauty-booking

# Клонируем проект (или загружаем файлы)
git clone https://github.com/your-repo/beauty-booking-mvp.git .

# Или создаем файлы вручную (см. раздел "Создание файлов проекта")

# Настраиваем переменные окружения
nano docker-compose.yml
# Измените NEXTAUTH_URL и APP_URL на ваш домен
# Измените секретные ключи на уникальные

# Запускаем приложение
docker compose up -d

# Инициализируем базу данных
./docker-init.sh

# Проверяем статус
docker compose ps
```

## 📦 Этап 3: Установка без Docker (альтернативный способ)

### 3.1 Установка Node.js
```bash
# Устанавливаем Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Проверяем версии
node --version  # должно быть v18.x.x
npm --version   # должно быть 9.x.x или выше

# Обновляем npm до последней версии
sudo npm install -g npm@latest
```

### 3.2 Установка PM2 (менеджер процессов)
```bash
# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Настраиваем автозапуск PM2
sudo pm2 startup systemd -u beautyapp --hp /home/beautyapp

# Проверяем установку
pm2 --version
```

### 3.3 Установка и настройка PostgreSQL (опционально)
```bash
# Устанавливаем PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Запускаем и включаем автозапуск
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создаем базу данных и пользователя
sudo -u postgres psql

-- В консоли PostgreSQL:
CREATE DATABASE beauty_booking;
CREATE USER beauty_booking WITH ENCRYPTED PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE beauty_booking TO beauty_booking;
\q

# Настраиваем подключения (опционально)
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Добавьте строку: local   beauty_booking   beauty_booking   md5

sudo systemctl restart postgresql
```

### 3.4 Установка Nginx
```bash
# Устанавливаем Nginx
sudo apt install -y nginx

# Запускаем и включаем автозапуск
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверяем статус
sudo systemctl status nginx
```

## 📁 Этап 4: Создание файлов проекта

### 4.1 Создание структуры проекта
```bash
# Создаем основную директорию
mkdir -p /home/beautyapp/beauty-booking
cd /home/beautyapp/beauty-booking

# Создаем структуру папок
mkdir -p src/app/{api/{auth/{login,register},bookings,teams,health},admin,book,login}
mkdir -p src/lib
mkdir -p prisma
mkdir -p public/uploads
```

### 4.2 Основные файлы конфигурации

#### package.json
```bash
cat > package.json << 'EOF'
{
  "name": "beauty-booking-mvp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma db push --force-reset && npm run db:seed",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop beauty-booking",
    "pm2:restart": "pm2 restart beauty-booking",
    "pm2:logs": "pm2 logs beauty-booking"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tsx": "^4.6.0",
    "eslint": "^8",
    "eslint-config-next": "14.2.5"
  }
}
EOF
```

#### .env
```bash
cat > .env << 'EOF'
# Database - используем SQLite для простоты
DATABASE_URL="file:./beauty_booking.db"

# Для PostgreSQL (раскомментируйте если используете):
# DATABASE_URL="postgresql://beauty_booking:secure_password_123@localhost:5432/beauty_booking"

# NextAuth
NEXTAUTH_SECRET="beauty-booking-production-secret-key-2024-change-this"
NEXTAUTH_URL="https://yourdomain.com"

# JWT
JWT_SECRET="jwt-secret-beauty-booking-production-2024-change-this"

# App Settings
APP_URL="https://yourdomain.com"

# File Upload
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=5242880

# Super Admin Default
SUPER_ADMIN_EMAIL="admin@yourdomain.com"
SUPER_ADMIN_PASSWORD="change-this-secure-password"
EOF
```

#### ecosystem.config.js (для PM2)
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'beauty-booking',
    script: 'npm',
    args: 'start',
    cwd: '/home/beautyapp/beauty-booking',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/beautyapp/logs/beauty-booking-error.log',
    out_file: '/home/beautyapp/logs/beauty-booking-out.log',
    log_file: '/home/beautyapp/logs/beauty-booking-combined.log',
    time: true
  }]
}
EOF
```

### 4.3 Автоматическое создание всех файлов проекта
```bash
# Скачиваем и запускаем скрипт создания проекта
curl -o setup-beauty-booking.sh https://raw.githubusercontent.com/your-repo/beauty-booking-mvp/main/setup-beauty-booking.sh
chmod +x setup-beauty-booking.sh
./setup-beauty-booking.sh
```

## 🔨 Этап 5: Установка зависимостей и сборка

### 5.1 Установка зависимостей
```bash
cd /home/beautyapp/beauty-booking

# Устанавливаем зависимости
npm install

# Генерируем Prisma клиент
npx prisma generate

# Создаем таблицы в базе данных
npx prisma db push

# Заполняем тестовыми данными
npm run db:seed
```

### 5.2 Сборка приложения
```bash
# Собираем приложение для продакшена
npm run build

# Создаем директорию для логов
mkdir -p /home/beautyapp/logs
```

## 🌐 Этап 6: Настройка Nginx

### 6.1 Создание конфигурации Nginx
```bash
sudo nano /etc/nginx/sites-available/beauty-booking
```

Добавьте следующую конфигурацию:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Временно для получения SSL сертификата
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Редирект на HTTPS (раскомментируйте после получения SSL)
    # return 301 https://$server_name$request_uri;

    # Временное проксирование на HTTP (удалите после настройки SSL)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# HTTPS конфигурация (раскомментируйте после получения SSL сертификата)
# server {
#     listen 443 ssl http2;
#     server_name yourdomain.com www.yourdomain.com;
# 
#     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
#     ssl_private_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
#     
#     # SSL настройки
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
#     ssl_prefer_server_ciphers off;
#     ssl_session_cache shared:SSL:10m;
#     ssl_session_timeout 10m;
# 
#     # Заголовки безопасности
#     add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
#     add_header X-Frame-Options "SAMEORIGIN" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-XSS-Protection "1; mode=block" always;
# 
#     # Основное проксирование
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#         proxy_read_timeout 86400;
#     }
# 
#     # Статические файлы
#     location /_next/static/ {
#         proxy_pass http://localhost:3000;
#         expires 1y;
#         add_header Cache-Control "public, immutable";
#     }
# 
#     location /uploads/ {
#         proxy_pass http://localhost:3000;
#         expires 1y;
#         add_header Cache-Control "public";
#     }
# }
```

### 6.2 Активация конфигурации
```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/beauty-booking /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
```

## 🔒 Этап 7: Настройка SSL сертификата

### 7.1 Установка Certbot
```bash
# Устанавливаем Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получаем SSL сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Проверяем автообновление
sudo certbot renew --dry-run
```

### 7.2 Обновление конфигурации Nginx после получения SSL
```bash
# Редактируем конфигурацию
sudo nano /etc/nginx/sites-available/beauty-booking

# Раскомментируйте HTTPS блок и редирект
# Закомментируйте временное HTTP проксирование

# Проверяем и перезапускаем
sudo nginx -t
sudo systemctl restart nginx
```

## 🚀 Этап 8: Запуск приложения

### 8.1 Запуск с PM2
```bash
cd /home/beautyapp/beauty-booking

# Запускаем приложение
pm2 start ecosystem.config.js

# Сохраняем конфигурацию PM2
pm2 save

# Проверяем статус
pm2 status
pm2 logs beauty-booking
```

### 8.2 Проверка работы
```bash
# Проверяем локально
curl http://localhost:3000/api/health

# Проверяем через домен
curl https://yourdomain.com/api/health

# Проверяем процессы
pm2 status
sudo systemctl status nginx
```

## 📊 Этап 9: Мониторинг и обслуживание

### 9.1 Настройка логирования
```bash
# Настраиваем ротацию логов
sudo nano /etc/logrotate.d/beauty-booking
```

Добавьте:
```
/home/beautyapp/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 beautyapp beautyapp
    postrotate
        pm2 restart beauty-booking
    endscript
}
```

### 9.2 Создание скриптов управления
```bash
# Скрипт обновления приложения
cat > /home/beautyapp/update-app.sh << 'EOF'
#!/bin/bash
echo "🔄 Обновление Beauty Booking..."

cd /home/beautyapp/beauty-booking

# Останавливаем приложение
pm2 stop beauty-booking

# Обновляем код (если используется Git)
git pull

# Устанавливаем зависимости
npm install

# Обновляем базу данных
npx prisma db push

# Собираем приложение
npm run build

# Запускаем приложение
pm2 start beauty-booking

echo "✅ Обновление завершено!"
EOF

chmod +x /home/beautyapp/update-app.sh
```

### 9.3 Скрипт бэкапа
```bash
cat > /home/beautyapp/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/beautyapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Бэкап базы данных SQLite
cp /home/beautyapp/beauty-booking/beauty_booking.db $BACKUP_DIR/db_backup_$DATE.db

# Бэкап загруженных файлов
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C /home/beautyapp/beauty-booking/public uploads/

# Удаляем старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ Бэкап создан: $DATE"
EOF

chmod +x /home/beautyapp/backup.sh
```

### 9.4 Настройка cron задач
```bash
# Открываем crontab
crontab -e

# Добавляем задачи:
# Бэкап каждый день в 2:00
0 2 * * * /home/beautyapp/backup.sh >> /home/beautyapp/logs/backup.log 2>&1

# Перезапуск PM2 каждую неделю в воскресенье в 3:00
0 3 * * 0 pm2 restart beauty-booking

# Очистка логов каждый месяц
0 4 1 * * find /home/beautyapp/logs -name "*.log" -mtime +30 -delete
```

## 🔍 Этап 10: Проверка и тестирование

### 10.1 Проверка всех компонентов
```bash
# Проверяем статус сервисов
sudo systemctl status nginx
sudo systemctl status postgresql  # если используется
pm2 status

# Проверяем порты
netstat -tlnp | grep :80
netstat -tlnp | grep :443
netstat -tlnp | grep :3000

# Проверяем логи
pm2 logs beauty-booking --lines 50
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 10.2 Тестирование API
```bash
# Health check
curl https://yourdomain.com/api/health

# Тест регистрации
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "teamName": "Test Salon",
    "contactPerson": "Test User"
  }'

# Тест входа
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "your-admin-password"
  }'
```

## 🎯 Этап 11: Финальная настройка

### 11.1 Обновление переменных окружения
```bash
cd /home/beautyapp/beauty-booking
nano .env

# Обновите следующие переменные:
# NEXTAUTH_URL="https://yourdomain.com"
# APP_URL="https://yourdomain.com"
# SUPER_ADMIN_EMAIL="admin@yourdomain.com"
# SUPER_ADMIN_PASSWORD="your-secure-password"

# Перезапустите приложение
pm2 restart beauty-booking
```

### 11.2 Создание супер-админа
```bash
# Подключаемся к базе данных
npx prisma studio

# Или через консоль создаем супер-админа
node -e "
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./src/lib/auth');

async function createSuperAdmin() {
  const prisma = new PrismaClient();
  const hashedPassword = await hashPassword('your-secure-password');
  
  await prisma.user.create({
    data: {
      email: 'admin@yourdomain.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true
    }
  });
  
  console.log('Super admin created!');
  await prisma.\$disconnect();
}

createSuperAdmin();
"
```

## ✅ Проверка установки

После завершения всех этапов у вас должно быть:

### ✅ **Работающие сервисы:**
- ✅ Nginx (порт 80, 443)
- ✅ Beauty Booking приложение (порт 3000)
- ✅ PostgreSQL/SQLite база данных
- ✅ PM2 менеджер процессов
- ✅ SSL сертификат

### ✅ **Доступные URL:**
- ✅ `https://yourdomain.com` - главная страница (регистрация)
- ✅ `https://yourdomain.com/login` - вход в систему
- ✅ `https://yourdomain.com/admin` - админ панель
- ✅ `https://yourdomain.com/book/salon-slug` - виджет записи
- ✅ `https://yourdomain.com/api/health` - проверка состояния

### ✅ **Тестовые доступы:**
- **Супер-админ**: admin@yourdomain.com / your-secure-password
- **Админ салона**: salon@example.com / password123
- **Мастер**: master@example.com / master123

## 🚨 Важные моменты безопасности

1. **Измените все пароли по умолчанию**
2. **Обновите секретные ключи в .env**
3. **Настройте регулярные бэкапы**
4. **Мониторьте логи на ошибки**
5. **Обновляйте систему и зависимости**

## 🆘 Решение проблем

### Приложение не запускается:
```bash
# Проверяем логи
pm2 logs beauty-booking
# Проверяем порт
netstat -tlnp | grep :3000
# Перезапускаем
pm2 restart beauty-booking
```

### Nginx ошибки:
```bash
# Проверяем конфигурацию
sudo nginx -t
# Проверяем логи
sudo tail -f /var/log/nginx/error.log
```

### База данных недоступна:
```bash
# Для PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1;"

# Для SQLite
ls -la /home/beautyapp/beauty-booking/*.db
```

## 🎉 Готово!

Ваше приложение Beauty Booking MVP успешно установлено и готово к работе! 🚀

**Адрес приложения**: https://yourdomain.com