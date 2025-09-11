# Инструкции для деплоя исправлений

## Проблема
На проде ошибка 500 в API `/api/superadmin/global-notification-settings` из-за отсутствия таблицы `global_notification_settings`.

## Решение

### 1. Применить SQL миграцию
Выполнить SQL из файла `migration_global_notification_settings.sql` на продакшен базе данных.

### 2. Перезапустить приложение
После применения миграции перезапустить приложение на проде.

### 3. Проверить
- Открыть https://test.2minutes.ru/superadmin/global-notification-settings
- Должна загрузиться страница с настройками уведомлений
- API должен возвращать 200 вместо 500

## Что добавлено

### Новые функции:
1. **Глобальные настройки уведомлений** - централизованные параметры для всех команд
2. **Переключатель уведомлений в списке команд** - быстрое включение/выключение для каждой команды
3. **Упрощенные настройки команд** - только вкл/выкл уведомлений

### Файлы:
- `src/app/superadmin/global-notification-settings/page.tsx` - страница глобальных настроек
- `src/app/api/superadmin/global-notification-settings/route.ts` - API глобальных настроек
- `src/app/superadmin/notifications/settings/page.tsx` - упрощенные настройки команд
- `src/app/superadmin/page.tsx` - добавлен переключатель в список команд
- `src/app/api/superadmin/teams/route.ts` - обновлен API команд

### База данных:
- Новая таблица `global_notification_settings`
- Обновлена таблица `notification_settings` (упрощена)
