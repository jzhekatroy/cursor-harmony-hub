#!/bin/bash

echo "🔧 Настройка GitHub деплоя для Beauty Booking"
echo "============================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Этот скрипт настроит:${NC}"
echo "1. SSH ключи для GitHub"
echo "2. Git репозиторий"
echo "3. GitHub Actions секреты"
echo "4. Автоматический деплой"
echo

# Проверяем что мы на сервере
if [[ ! -d "/home/beautyapp" ]]; then
    echo -e "${RED}❌ Этот скрипт нужно запускать на сервере!${NC}"
    exit 1
fi

# Переходим в рабочую директорию
cd /home/beautyapp/beauty-booking || {
    echo -e "${RED}❌ Директория /home/beautyapp/beauty-booking не найдена!${NC}"
    exit 1
}

echo -e "${YELLOW}🔑 Шаг 1: Создание SSH ключей${NC}"
echo "=================================="

# Создаем SSH ключ если его нет
if [[ ! -f ~/.ssh/id_rsa ]]; then
    echo "Создаем новый SSH ключ..."
    ssh-keygen -t rsa -b 4096 -C "beautyapp@$(hostname)" -f ~/.ssh/id_rsa -N ""
    echo -e "${GREEN}✅ SSH ключ создан${NC}"
else
    echo -e "${GREEN}✅ SSH ключ уже существует${NC}"
fi

# Показываем публичный ключ
echo
echo -e "${BLUE}📋 Ваш публичный SSH ключ (скопируйте его):${NC}"
echo "=================================================="
cat ~/.ssh/id_rsa.pub
echo "=================================================="
echo
echo -e "${YELLOW}⚠️  ВАЖНО: Добавьте этот ключ в GitHub:${NC}"
echo "1. Идите на github.com → Settings → SSH and GPG keys"
echo "2. Нажмите 'New SSH key'"
echo "3. Вставьте ключ выше"
echo "4. Сохраните"
echo

read -p "Добавили SSH ключ в GitHub? (y/N): " SSH_ADDED
if [[ $SSH_ADDED != "y" && $SSH_ADDED != "Y" ]]; then
    echo -e "${RED}❌ Добавьте SSH ключ и запустите скрипт снова${NC}"
    exit 1
fi

echo
echo -e "${YELLOW}📦 Шаг 2: Настройка Git репозитория${NC}"
echo "===================================="

read -p "Введите URL вашего GitHub репозитория (git@github.com:username/repo.git): " REPO_URL

if [[ -z "$REPO_URL" ]]; then
    echo -e "${RED}❌ URL репозитория не может быть пустым${NC}"
    exit 1
fi

# Добавляем remote origin
if git remote get-url origin >/dev/null 2>&1; then
    echo "Обновляем существующий origin..."
    git remote set-url origin "$REPO_URL"
else
    echo "Добавляем новый origin..."
    git remote add origin "$REPO_URL"
fi

# Переключаемся на main ветку
git checkout -b main 2>/dev/null || git checkout main

echo -e "${GREEN}✅ Git репозиторий настроен${NC}"

echo
echo -e "${YELLOW}🚀 Шаг 3: Первый пуш в GitHub${NC}"
echo "=============================="

# Пушим код в GitHub
echo "Отправляем код в GitHub..."
git push -u origin main

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Код успешно отправлен в GitHub${NC}"
else
    echo -e "${RED}❌ Ошибка при отправке в GitHub${NC}"
    echo "Проверьте:"
    echo "1. SSH ключ добавлен в GitHub"
    echo "2. URL репозитория правильный"
    echo "3. У вас есть права на запись в репозиторий"
    exit 1
fi

echo
echo -e "${YELLOW}🔧 Шаг 4: Создание деплой скрипта${NC}"
echo "================================="

# Создаем скрипт для деплоя на сервере
cat > deploy-from-github.sh << 'EOF'
#!/bin/bash

echo "🚀 Деплой из GitHub"
echo "==================="

# Останавливаем приложение
echo "⏸️ Останавливаем приложение..."
sudo -u beautyapp pm2 stop beauty-booking

# Делаем git pull
echo "📥 Получаем изменения из GitHub..."
sudo -u beautyapp git pull origin main

if [[ $? -ne 0 ]]; then
    echo "❌ Ошибка при получении изменений!"
    sudo -u beautyapp pm2 start beauty-booking
    exit 1
fi

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
sudo -u beautyapp npm install

# Собираем приложение
echo "🔨 Собираем приложение..."
sudo -u beautyapp npm run build

if [[ $? -ne 0 ]]; then
    echo "❌ Ошибка сборки!"
    sudo -u beautyapp pm2 start beauty-booking
    exit 1
fi

# Запускаем приложение
echo "▶️ Запускаем приложение..."
sudo -u beautyapp pm2 restart beauty-booking

echo "🎉 Деплой завершен!"
echo "🔗 Проверьте: http://test.2minutes.ru"
EOF

chmod +x deploy-from-github.sh
chown beautyapp:beautyapp deploy-from-github.sh

echo -e "${GREEN}✅ Деплой скрипт создан${NC}"

echo
echo -e "${GREEN}🎉 Настройка завершена!${NC}"
echo "======================="
echo
echo -e "${BLUE}📋 Что дальше:${NC}"
echo "1. Теперь создайте GitHub Actions (я покажу как)"
echo "2. Протестируем автоматический деплой"
echo
echo -e "${BLUE}🔗 Полезные команды:${NC}"
echo "• Деплой вручную: ./deploy-from-github.sh"
echo "• Проверка статуса: pm2 status"
echo "• Логи: pm2 logs beauty-booking"