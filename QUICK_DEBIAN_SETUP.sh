#!/bin/bash

# 🚀 Beauty Booking MVP - Автоматическая установка на Debian
# Версия: 1.0
# Дата: 2024

set -e  # Остановка при ошибке

echo "🚀 Начинаем установку Beauty Booking MVP на Debian сервер..."
echo "⏳ Это займет около 10-15 минут..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   print_error "Этот скрипт должен быть запущен с правами root"
   echo "Используйте: sudo $0"
   exit 1
fi

# Получение параметров от пользователя
print_header "Настройка параметров"

read -p "Введите доменное имя (например: beauty.example.com): " DOMAIN_NAME
read -p "Введите email для SSL сертификата: " SSL_EMAIL
read -p "Введите email супер-админа: " ADMIN_EMAIL
read -s -p "Введите пароль супер-админа: " ADMIN_PASSWORD
echo ""

# Генерация секретных ключей
NEXTAUTH_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

print_status "Домен: $DOMAIN_NAME"
print_status "Email: $SSL_EMAIL"
print_status "Админ: $ADMIN_EMAIL"

# Этап 1: Обновление системы
print_header "Этап 1: Обновление системы"
apt update && apt upgrade -y
apt install -y curl wget git nano htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw

# Этап 2: Настройка файрвола
print_header "Этап 2: Настройка файрвола"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Этап 3: Создание пользователя
print_header "Этап 3: Создание пользователя приложения"
if ! id "beautyapp" &>/dev/null; then
    useradd -m -s /bin/bash beautyapp
    usermod -aG sudo beautyapp
    print_status "Пользователь beautyapp создан"
else
    print_status "Пользователь beautyapp уже существует"
fi

# Этап 4: Установка Node.js
print_header "Этап 4: Установка Node.js"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g npm@latest pm2

# Этап 5: Установка Nginx
print_header "Этап 5: Установка Nginx"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Этап 6: Создание директории проекта
print_header "Этап 6: Создание структуры проекта"
PROJECT_DIR="/home/beautyapp/beauty-booking"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Создание структуры папок
mkdir -p src/app/{api/{auth/{login,register},bookings,teams,health},admin,book,login}
mkdir -p src/lib
mkdir -p prisma
mkdir -p public/uploads
mkdir -p /home/beautyapp/logs

# Этап 7: Создание файлов конфигурации
print_header "Этап 7: Создание файлов конфигурации"

# package.json
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
    "db:reset": "prisma db push --force-reset && npm run db:seed"
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

# .env
cat > .env << EOF
# Database
DATABASE_URL="file:./beauty_booking.db"

# NextAuth
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="https://$DOMAIN_NAME"

# JWT
JWT_SECRET="$JWT_SECRET"

# App Settings
APP_URL="https://$DOMAIN_NAME"

# File Upload
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=5242880

# Super Admin
SUPER_ADMIN_EMAIL="$ADMIN_EMAIL"
SUPER_ADMIN_PASSWORD="$ADMIN_PASSWORD"
EOF

# ecosystem.config.js
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

print_status "Конфигурационные файлы созданы"

# Этап 8: Загрузка исходного кода
print_header "Этап 8: Создание исходного кода приложения"
print_warning "Здесь должен быть код для создания всех файлов приложения"
print_warning "Используйте setup-beauty-booking.sh для создания полного кода"

# Временно создаем минимальный next.config.ts
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
EOF

# Этап 9: Настройка Nginx
print_header "Этап 9: Настройка Nginx"

cat > /etc/nginx/sites-available/beauty-booking << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Активация конфигурации Nginx
ln -sf /etc/nginx/sites-available/beauty-booking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

print_status "Nginx настроен"

# Этап 10: Установка SSL сертификата
print_header "Этап 10: Установка SSL сертификата"
apt install -y certbot python3-certbot-nginx

print_status "Получение SSL сертификата для $DOMAIN_NAME..."
certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --email $SSL_EMAIL --agree-tos --non-interactive

# Проверка автообновления
certbot renew --dry-run

print_status "SSL сертификат установлен"

# Этап 11: Установка зависимостей и сборка
print_header "Этап 11: Установка зависимостей"
chown -R beautyapp:beautyapp $PROJECT_DIR

# Переключаемся на пользователя beautyapp для установки
sudo -u beautyapp bash << 'EOSU'
cd /home/beautyapp/beauty-booking
npm install
EOSU

print_status "Зависимости установлены"

# Этап 12: Настройка PM2 автозапуска
print_header "Этап 12: Настройка автозапуска"
sudo -u beautyapp pm2 startup systemd -u beautyapp --hp /home/beautyapp

# Этап 13: Создание скриптов управления
print_header "Этап 13: Создание скриптов управления"

# Скрипт запуска приложения
cat > /home/beautyapp/start-app.sh << 'EOF'
#!/bin/bash
cd /home/beautyapp/beauty-booking

echo "🚀 Запуск Beauty Booking..."

# Генерируем Prisma клиент
npx prisma generate

# Создаем/обновляем базу данных
npx prisma db push

# Заполняем тестовыми данными (если база пустая)
npm run db:seed || echo "База данных уже содержит данные"

# Собираем приложение
npm run build

# Запускаем через PM2
pm2 start ecosystem.config.js
pm2 save

echo "✅ Приложение запущено!"
echo "🔗 Доступно по адресу: https://$DOMAIN_NAME"
EOF

chmod +x /home/beautyapp/start-app.sh
chown beautyapp:beautyapp /home/beautyapp/start-app.sh

# Скрипт бэкапа
cat > /home/beautyapp/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/beautyapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Бэкап базы данных
cp /home/beautyapp/beauty-booking/beauty_booking.db $BACKUP_DIR/db_backup_$DATE.db

# Бэкап загруженных файлов
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C /home/beautyapp/beauty-booking/public uploads/

# Удаляем старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ Бэкап создан: $DATE"
EOF

chmod +x /home/beautyapp/backup.sh
chown beautyapp:beautyapp /home/beautyapp/backup.sh

# Настройка cron
sudo -u beautyapp bash << 'EOSU'
(crontab -l 2>/dev/null; echo "0 2 * * * /home/beautyapp/backup.sh >> /home/beautyapp/logs/backup.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * 0 pm2 restart beauty-booking") | crontab -
EOSU

print_status "Скрипты управления созданы"

# Финальная настройка прав доступа
chown -R beautyapp:beautyapp /home/beautyapp/

print_header "🎉 Установка завершена!"
echo ""
print_status "Для завершения установки выполните следующие шаги:"
echo ""
echo "1. Создайте файлы исходного кода приложения:"
echo "   sudo -u beautyapp /home/beautyapp/beauty-booking/setup-beauty-booking.sh"
echo ""
echo "2. Запустите приложение:"
echo "   sudo -u beautyapp /home/beautyapp/start-app.sh"
echo ""
echo "3. Проверьте работу:"
echo "   curl https://$DOMAIN_NAME/api/health"
echo ""
echo "🔗 Приложение будет доступно по адресу: https://$DOMAIN_NAME"
echo "👤 Супер-админ: $ADMIN_EMAIL"
echo "🔑 Пароль: [указанный вами пароль]"
echo ""
echo "📁 Директория проекта: $PROJECT_DIR"
echo "📊 Логи: /home/beautyapp/logs/"
echo "🔧 Управление: pm2 status, pm2 logs beauty-booking, pm2 restart beauty-booking"
echo ""
print_status "Установка завершена успешно! 🚀"