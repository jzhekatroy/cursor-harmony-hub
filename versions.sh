#!/bin/bash

echo "📦 История версий Beauty Booking"
echo "==============================="

# Текущая версия
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null)

if [[ -n $CURRENT_TAG ]]; then
    echo "📍 Текущая версия: $CURRENT_TAG"
elif [[ -n $CURRENT_BRANCH ]]; then
    echo "📍 Текущая ветка: $CURRENT_BRANCH"
else
    echo "📍 Текущая версия: неопределена"
fi

echo
echo "📋 Список версий:"
echo "=================="

# Показываем теги с информацией о коммитах
git tag -l --sort=-version:refname | while read tag; do
    if [[ -n $tag ]]; then
        commit_info=$(git log -1 --format="%h %s" $tag 2>/dev/null)
        date_info=$(git log -1 --format="%ci" $tag 2>/dev/null | cut -d' ' -f1)
        echo "🏷️  $tag ($date_info) - $commit_info"
    fi
done

if [[ -z $(git tag -l) ]]; then
    echo "❌ Версии не найдены"
fi