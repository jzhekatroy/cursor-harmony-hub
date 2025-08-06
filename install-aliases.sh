#!/bin/bash

echo "🚀 Установка полезных алиасов для Beauty Booking..."

# Добавляем алиасы в ~/.bashrc
cat >> ~/.bashrc << 'EOF'

# ================================================
# Beauty Booking Aliases
# ================================================

# Навигация
alias bb='cd /home/beautyapp/beauty-booking'

# Логи и мониторинг
alias bb-logs='cd /home/beautyapp/beauty-booking && tail -f nohup.out'
alias bb-errors='cd /home/beautyapp/beauty-booking && grep -i error nohup.out | tail -10'
alias bb-status='cd /home/beautyapp/beauty-booking && curl -s http://localhost:3000/api/status'
alias bb-debug='cd /home/beautyapp/beauty-booking && curl -s http://localhost:3000/api/debug'

# Процессы и порты
alias bb-processes='ps aux | grep -E "(npm|node)" | grep -v grep'
alias bb-port='netstat -punta | grep 3000'
alias bb-kill='sudo pkill -9 -f "npm start"'

# Управление приложением
alias bb-restart='cd /home/beautyapp/beauty-booking && ./restart-app.sh'
alias bb-fix='cd /home/beautyapp/beauty-booking && ./scripts/force-fix.sh'
alias bb-kill-port='cd /home/beautyapp/beauty-booking && ./scripts/kill-port-3000.sh'
alias bb-start='cd /home/beautyapp/beauty-booking && sudo -u beautyapp nohup npm start > nohup.out 2>&1 &'

# База данных
alias bb-backup='cd /home/beautyapp/beauty-booking && ./scripts/protect-database.sh'
alias bb-restore='/home/beautyapp/db-backups/restore-latest.sh'
alias bb-backups='ls -la /home/beautyapp/db-backups/'
alias bb-db-fix='cd /home/beautyapp/beauty-booking && ./scripts/fix-database-permissions.sh'
alias bb-db-size='ls -lh /home/beautyapp/beauty-booking/prisma/dev.db'

# Деплой и обновление
alias bb-deploy='cd /home/beautyapp/beauty-booking && git pull && sudo -u beautyapp npm run build && ./restart-app.sh'
alias bb-git='cd /home/beautyapp/beauty-booking && git status'
alias bb-pull='cd /home/beautyapp/beauty-booking && git pull origin main'

# Быстрая диагностика
alias bb-check='echo "=== Процессы ===" && bb-processes && echo -e "\n=== Порт 3000 ===" && bb-port && echo -e "\n=== Статус API ===" && bb-status'

# Системные ресурсы
alias bb-disk='df -h /'
alias bb-memory='free -h'
alias bb-top='top | head -20'

EOF

# Применяем изменения
source ~/.bashrc

echo "✅ Алиасы установлены!"
echo ""
echo "📋 Доступные команды:"
echo "  bb           - Перейти в директорию проекта"
echo "  bb-logs      - Показать логи в реальном времени"  
echo "  bb-status    - Проверить статус API"
echo "  bb-restart   - Перезапустить приложение"
echo "  bb-fix       - Полное исправление проблем"
echo "  bb-backup    - Создать резервную копию БД"
echo "  bb-deploy    - Обновить и перезапустить"
echo "  bb-check     - Быстрая диагностика"
echo ""
echo "Для применения алиасов выполните: source ~/.bashrc"
echo "Или перелогиньтесь на сервер"