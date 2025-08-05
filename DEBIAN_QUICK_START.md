# 🚀 Beauty Booking MVP - Быстрая установка на Debian

## ⚡ Автоматическая установка (рекомендуется)

### 1. Скачайте и запустите скрипт установки:
```bash
# Подключитесь к серверу по SSH
ssh root@your-server-ip

# Скачайте скрипт автоматической установки
wget https://raw.githubusercontent.com/your-repo/beauty-booking-mvp/main/QUICK_DEBIAN_SETUP.sh

# Запустите установку
chmod +x QUICK_DEBIAN_SETUP.sh
sudo ./QUICK_DEBIAN_SETUP.sh
```

### 2. Введите параметры при запросе:
- **Доменное имя**: `beauty.example.com`
- **Email для SSL**: `admin@example.com`
- **Email супер-админа**: `admin@beauty.example.com`
- **Пароль супер-админа**: `secure_password_123`

### 3. Дождитесь завершения установки (10-15 минут)

### 4. Создайте исходный код приложения:
```bash
# Переключитесь на пользователя приложения
sudo su - beautyapp

# Перейдите в директорию проекта
cd /home/beautyapp/beauty-booking

# Скачайте и запустите скрипт создания файлов
wget https://raw.githubusercontent.com/your-repo/beauty-booking-mvp/main/setup-beauty-booking.sh
chmod +x setup-beauty-booking.sh
./setup-beauty-booking.sh
```

### 5. Запустите приложение:
```bash
# Запустите приложение
./start-app.sh

# Проверьте статус
pm2 status
```

### 6. Готово! 🎉
Приложение доступно по адресу: **https://your-domain.com**

---

## 🔧 Ручная установка (пошагово)

### Этап 1: Подготовка сервера
```bash
# Обновление системы
apt update && apt upgrade -y
apt install -y curl wget git nano htop unzip ufw

# Настройка файрвола
ufw allow ssh && ufw allow 80 && ufw allow 443
ufw --force enable

# Создание пользователя
useradd -m -s /bin/bash beautyapp
usermod -aG sudo beautyapp
```

### Этап 2: Установка Node.js и PM2
```bash
# Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g npm@latest pm2
```

### Этап 3: Установка Nginx
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### Этап 4: Создание проекта
```bash
# Создание структуры
mkdir -p /home/beautyapp/beauty-booking
cd /home/beautyapp/beauty-booking

# Создание файлов (используйте setup-beauty-booking.sh)
# Или создайте вручную по инструкции DEBIAN_INSTALL_GUIDE.md
```

### Этап 5: Настройка Nginx
```bash
# Создание конфигурации
nano /etc/nginx/sites-available/beauty-booking

# Активация
ln -s /etc/nginx/sites-available/beauty-booking /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### Этап 6: SSL сертификат
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Этап 7: Запуск приложения
```bash
cd /home/beautyapp/beauty-booking
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run build
pm2 start ecosystem.config.js
pm2 save
```

---

## 📊 Проверка установки

### Проверка сервисов:
```bash
# Статус сервисов
systemctl status nginx
pm2 status

# Проверка портов
netstat -tlnp | grep :80
netstat -tlnp | grep :443
netstat -tlnp | grep :3000
```

### Проверка приложения:
```bash
# Health check
curl https://yourdomain.com/api/health

# Тест регистрации
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","teamName":"Test Salon","contactPerson":"Test"}'
```

---

## 🔧 Управление приложением

### PM2 команды:
```bash
pm2 status              # Статус процессов
pm2 logs beauty-booking  # Просмотр логов
pm2 restart beauty-booking # Перезапуск
pm2 stop beauty-booking    # Остановка
pm2 start beauty-booking   # Запуск
```

### Nginx команды:
```bash
sudo nginx -t                    # Проверка конфигурации
sudo systemctl restart nginx    # Перезапуск
sudo systemctl status nginx     # Статус
```

### Логи:
```bash
# Логи приложения
tail -f /home/beautyapp/logs/beauty-booking-combined.log

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🆘 Решение проблем

### Приложение не запускается:
```bash
# Проверьте логи
pm2 logs beauty-booking

# Проверьте порт
netstat -tlnp | grep :3000

# Перезапустите
pm2 restart beauty-booking
```

### SSL ошибки:
```bash
# Обновите сертификат
sudo certbot renew

# Проверьте конфигурацию Nginx
sudo nginx -t
```

### База данных:
```bash
# Проверьте файл базы данных
ls -la /home/beautyapp/beauty-booking/*.db

# Пересоздайте базу данных
cd /home/beautyapp/beauty-booking
npm run db:reset
```

---

## 📁 Структура проекта

```
/home/beautyapp/beauty-booking/
├── src/                    # Исходный код
├── prisma/                 # База данных
├── public/                 # Статические файлы
├── .env                    # Переменные окружения
├── package.json            # Зависимости
├── ecosystem.config.js     # Конфигурация PM2
└── start-app.sh           # Скрипт запуска
```

---

## 🎯 Доступы после установки

### URLs:
- **Главная**: https://yourdomain.com
- **Вход**: https://yourdomain.com/login
- **Админ панель**: https://yourdomain.com/admin
- **API**: https://yourdomain.com/api/health

### Тестовые аккаунты:
- **Супер-админ**: admin@yourdomain.com / your-password
- **Админ салона**: salon@example.com / password123
- **Мастер**: master@example.com / master123

---

## 🎉 Готово!

После успешной установки у вас будет полностью рабочее приложение Beauty Booking MVP на вашем Debian сервере! 🚀