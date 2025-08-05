#!/bin/bash

echo "🚀 Быстрая настройка GitHub деплоя"
echo "=================================="

# Получаем URL репозитория от пользователя
echo "📋 Сначала создайте репозиторий на GitHub:"
echo "1. Идите на github.com"
echo "2. Нажмите 'New repository'"
echo "3. Название: beauty-booking-mvp"
echo "4. НЕ добавляйте README, .gitignore, license"
echo

read -p "Введите URL вашего репозитория (например: git@github.com:username/beauty-booking-mvp.git): " REPO_URL

if [[ -z "$REPO_URL" ]]; then
    echo "❌ URL репозитория обязателен!"
    exit 1
fi

echo
echo "🔧 Настраиваем Git..."

# Добавляем .gitignore если его нет
if [[ ! -f .gitignore ]]; then
    cat > .gitignore << 'EOF'
node_modules/
.next/
*.db
*.log
.env.local
.DS_Store
EOF
    echo "✅ Создан .gitignore"
fi

# Настраиваем Git
git init
git add .
git commit -m "Initial commit: Beauty Booking MVP"

# Добавляем remote
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

# Переименовываем ветку в main
git branch -M main

echo "📤 Отправляем код в GitHub..."
git push -u origin main

if [[ $? -eq 0 ]]; then
    echo "✅ Код успешно отправлен в GitHub!"
    echo
    echo "🎯 Следующие шаги:"
    echo "1. Скопируйте файл setup-github-deploy.sh на сервер"
    echo "2. Запустите его на сервере"
    echo "3. Настройте GitHub Secrets (см. GITHUB_DEPLOY_GUIDE.md)"
    echo
    echo "📁 Файлы для сервера:"
    echo "• setup-github-deploy.sh"
    echo "• GITHUB_DEPLOY_GUIDE.md"
else
    echo "❌ Ошибка при отправке в GitHub!"
    echo "Проверьте:"
    echo "1. URL репозитория правильный"
    echo "2. У вас есть права на запись"
    echo "3. SSH ключ настроен в GitHub"
fi