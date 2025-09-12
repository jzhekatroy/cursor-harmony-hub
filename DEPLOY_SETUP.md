# Настройка деплоя на собственный сервер

## Что нужно настроить

### 1. GitHub Secrets
Добавьте в настройки репозитория (Settings → Secrets and variables → Actions):

- `DATABASE_URL` - строка подключения к продакшн базе данных
- `SERVER_HOST` - IP адрес или домен вашего сервера
- `SERVER_USER` - пользователь для SSH (например: `root`, `ubuntu`, `deploy`)
- `SERVER_PATH` - путь на сервере куда деплоить (например: `/var/www/beauty-booking`)

### 2. Настройка сервера

#### Установка Node.js и PM2
```bash
# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Настройка PM2 для автозапуска
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

#### Создание директории для деплоя
```bash
sudo mkdir -p /var/www/beauty-booking
sudo chown $USER:$USER /var/www/beauty-booking
cd /var/www/beauty-booking
```

#### Настройка SSH ключей
```bash
# На вашем локальном компьютере
ssh-keygen -t rsa -b 4096 -C "github-actions"
ssh-copy-id -i ~/.ssh/id_rsa.pub $SERVER_USER@$SERVER_HOST

# Добавьте приватный ключ в GitHub Secrets как SSH_PRIVATE_KEY
```

### 3. Настройка базы данных на сервере

#### PostgreSQL
```bash
# Установка PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Создание базы данных
sudo -u postgres psql
CREATE DATABASE beauty;
CREATE USER beauty_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE beauty TO beauty_user;
\q
```

#### Настройка DATABASE_URL
```
DATABASE_URL="postgresql://beauty_user:your_password@localhost:5432/beauty?schema=public"
```

### 4. Настройка Nginx (опционально)
```nginx
server {
    listen 80;
    server_name your-domain.com;

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
    }
}
```

## Как работает деплой

1. **При push в main** - автоматически запускается workflow
2. **Сборка** - устанавливаются зависимости, генерируется Prisma Client
3. **Миграции** - выполняются миграции базы данных
4. **Архивирование** - создается tar.gz архив с кодом
5. **Загрузка** - файлы копируются на сервер через SCP
6. **Развертывание** - на сервере:
   - Останавливается старое приложение
   - Создается бэкап
   - Распаковывается новый код
   - Устанавливаются зависимости
   - Запускается новое приложение через PM2

## Проверка деплоя

После настройки секретов, при следующем push в main:
1. Зайдите в GitHub → Actions
2. Увидите запущенный workflow "Deploy to Production"
3. Проверьте логи на каждом шаге
4. После успешного деплоя - проверьте ваш сайт

## Откат (если что-то пошло не так)

```bash
# На сервере
cd /var/www/beauty-booking
pm2 stop beauty-booking
mv current current.broken
mv backup current
cd current
pm2 start npm --name "beauty-booking" -- start
```
