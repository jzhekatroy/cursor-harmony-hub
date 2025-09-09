# 📱 Запрос номера телефона в Telegram WebApp

## 🎯 Цель

Автоматически запрашивать номер телефона у пользователей Telegram WebApp при создании записи.

## ✨ Функциональность

### 1. Автоматическое заполнение данных
- **Имя**: Автоматически заполняется из `user.first_name` и `user.last_name` Telegram
- **Телефон**: Запрашивается через Telegram WebApp API

### 2. Запрос номера телефона
- **Автоматический запрос**: При загрузке формы в WebApp автоматически запрашивается номер
- **Ручной запрос**: Кнопка "📱 Получить из Telegram" для повторного запроса
- **Валидация**: Номер телефона обязателен для WebApp

### 3. UX улучшения
- Показывается подсказка о том, как получить номер из Telegram
- Индикатор загрузки при запросе контакта
- Обработка отказа пользователя предоставить контакт

## 🔧 Техническая реализация

### Компонент `EnhancedClientInfoAndConfirmation`

```typescript
// Автоматическое заполнение имени
React.useEffect(() => {
  if (telegramWebApp.user && !bookingData.clientInfo.name) {
    const firstName = telegramWebApp.user.first_name || ''
    const lastName = telegramWebApp.user.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim()
    
    if (fullName) {
      onClientInfoChange({
        ...bookingData.clientInfo,
        name: fullName
      })
    }
  }
}, [telegramWebApp.user, bookingData.clientInfo.name, onClientInfoChange])

// Автоматический запрос номера телефона
React.useEffect(() => {
  if (telegramWebApp.webApp && !bookingData.clientInfo.phone && !isRequestingPhone) {
    const timer = setTimeout(() => {
      if (telegramWebApp.webApp && !bookingData.clientInfo.phone) {
        requestPhoneNumber()
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }
}, [telegramWebApp.webApp, bookingData.clientInfo.phone, isRequestingPhone])
```

### API валидация

```typescript
if (!phoneE164) {
  if (isWebApp) {
    return NextResponse.json({ 
      error: 'Для записи через Telegram необходимо указать номер телефона' 
    }, { status: 400 })
  } else {
    return NextResponse.json({ 
      error: 'Укажите корректный телефон клиента' 
    }, { status: 400 })
  }
}
```

## 📱 Telegram WebApp API

### Метод `requestContact`

```typescript
telegramWebApp.webApp.requestContact((granted: boolean, contact?: any) => {
  if (granted && contact?.phone_number) {
    // Номер получен успешно
    onClientInfoChange({
      ...bookingData.clientInfo,
      phone: contact.phone_number
    })
  } else if (!granted) {
    // Пользователь отказался
    alert('Для записи необходимо предоставить номер телефона')
  }
})
```

## 🎨 UI элементы

### Поле телефона с кнопкой

```tsx
<div className="flex gap-2">
  <div className="relative flex-1">
    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
    <Input
      id="phone"
      type="tel"
      placeholder="+7 (999) 123-45-67"
      value={bookingData.clientInfo.phone}
      onChange={(e) => handleInputChange('phone', e.target.value)}
    />
  </div>
  {telegramWebApp.webApp && (
    <Button
      type="button"
      variant="outline"
      onClick={requestPhoneNumber}
      disabled={isRequestingPhone}
    >
      {isRequestingPhone ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
      ) : (
        '📱 Получить из Telegram'
      )}
    </Button>
  )}
</div>
```

## 🔄 Поток работы

1. **Пользователь открывает WebApp** → Автоматически заполняется имя
2. **Загружается форма записи** → Через 1 секунду автоматически запрашивается номер телефона
3. **Пользователь разрешает доступ** → Номер автоматически заполняется в поле
4. **Пользователь отказывается** → Показывается предупреждение, можно ввести вручную
5. **Создание записи** → Валидация обязательности номера для WebApp

## 🛡️ Безопасность

- Номер телефона запрашивается только в WebApp
- Пользователь может отказаться и ввести номер вручную
- Валидация на сервере предотвращает создание записей без телефона
- Все данные логируются для отладки

## 🐛 Отладка

### Логи в консоли
```
📱 WebApp detected, requesting phone number...
📱 Получен контакт из Telegram: {phone_number: "+79123456789"}
❌ Пользователь отказался предоставить контакт
```

### Проверка в DevTools
- `window.Telegram.WebApp.requestContact` - доступен ли метод
- `telegramWebApp.webApp` - инициализирован ли WebApp
- `telegramWebApp.user` - получены ли данные пользователя

## 📋 Требования

- Telegram WebApp API должен поддерживать `requestContact`
- Пользователь должен разрешить доступ к контактам
- Бот должен быть правильно настроен в @BotFather
