#!/bin/bash

# 🎨 Скрипт для применения изменений от Lovable
# Использование: ./apply-lovable-changes.sh

set -e  # Остановить при ошибке

echo "🎨 Applying Lovable design improvements..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from project root."
    exit 1
fi

# Создаем резервную копию
echo "📦 Creating backup..."
git checkout -b lovable-improvements 2>/dev/null || echo "Branch already exists"
git add .
git commit -m "Backup before Lovable integration" || echo "No changes to commit"

# Проверяем наличие папки с кодом от Lovable
if [ ! -d "lovable-code" ]; then
    echo "❌ Error: lovable-code directory not found!"
    echo "Please create lovable-code directory and put Lovable's code there:"
    echo "mkdir lovable-code"
    echo "cp lovable-files/* lovable-code/"
    exit 1
fi

echo "📁 Found lovable-code directory"

# Применяем изменения
echo "🔄 Applying improved components..."

# Главный компонент
if [ -f "lovable-code/BookingWidget.tsx" ]; then
    echo "  📄 Updating BookingWidget..."
    cp lovable-code/BookingWidget.tsx src/app/book/[slug]/page.tsx
fi

# Компоненты
if [ -f "lovable-code/EnhancedServiceSelection.tsx" ]; then
    echo "  📄 Updating EnhancedServiceSelection..."
    cp lovable-code/EnhancedServiceSelection.tsx src/components/
fi

if [ -f "lovable-code/EnhancedDateMasterTimeSelection.tsx" ]; then
    echo "  📄 Updating EnhancedDateMasterTimeSelection..."
    cp lovable-code/EnhancedDateMasterTimeSelection.tsx src/components/
fi

if [ -f "lovable-code/EnhancedClientInfoAndConfirmation.tsx" ]; then
    echo "  📄 Updating EnhancedClientInfoAndConfirmation..."
    cp lovable-code/EnhancedClientInfoAndConfirmation.tsx src/components/
fi

# Стили
if [ -f "lovable-code/styles.css" ]; then
    echo "  🎨 Updating styles..."
    cp lovable-code/styles.css src/styles/
fi

if [ -f "lovable-code/tailwind.config.js" ]; then
    echo "  🎨 Updating Tailwind config..."
    cp lovable-code/tailwind.config.js ./
fi

# Проверяем сборку
echo "🔨 Building project..."
if npm run build; then
    echo "✅ Build successful!"
    
    # Коммитим изменения
    echo "💾 Committing changes..."
    git add .
    git commit -m "Apply Lovable design improvements

- Updated BookingWidget with new design
- Enhanced mobile responsiveness  
- Added animations and transitions
- Improved UX and accessibility
- Maintained all existing functionality"
    
    echo "🎉 Changes applied successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test the application: npm run dev"
    echo "2. Check mobile responsiveness"
    echo "3. Test Telegram integration"
    echo "4. Deploy to test server"
    echo ""
    echo "To merge to main:"
    echo "git checkout main"
    echo "git merge lovable-improvements"
    
else
    echo "❌ Build failed! Please check the errors above."
    echo "Reverting changes..."
    git checkout main
    git branch -D lovable-improvements
    echo "Changes reverted. Please fix the issues and try again."
    exit 1
fi
