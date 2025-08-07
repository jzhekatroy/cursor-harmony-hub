# 🤖 Настройка Telegram Bot для WebApp

## 🚨 ПРОБЛЕМА: "No user data available"

Если в WebApp показывается `👤 No user data available`, значит бот не передает данные пользователя.

## ✅ РЕШЕНИЕ 1: Настройка Mini App в @BotFather

1. **Откройте @BotFather**
2. **Выберите `/mybots` → ваш бот → `Bot Settings` → `Mini App`**
3. **Установите URL:** `https://test.2minutes.ru/book/first`

## ✅ РЕШЕНИЕ 2: Правильная кнопка в коде бота

### 🔧 Python (pyTelegramBotAPI):
```python
from telebot import TeleBot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Правильная кнопка с user data
keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton(
        "📅 Записаться", 
        web_app=WebAppInfo("https://test.2minutes.ru/book/first")
    )]
])

# Отправляем с кнопкой
bot.send_message(
    chat_id, 
    "Выберите салон для записи:", 
    reply_markup=keyboard
)
```

### 🔧 Node.js (node-telegram-bot-api):
```javascript
const TelegramBot = require('node-telegram-bot-api');

bot.sendMessage(chatId, 'Выберите салон для записи:', {
  reply_markup: {
    inline_keyboard: [[
      {
        text: '📅 Записаться',
        web_app: { url: 'https://test.2minutes.ru/book/first' }
      }
    ]]
  }
});
```

## ✅ РЕШЕНИЕ 3: С параметрами запуска

### 🔧 С start_param для идентификации:
```python
# Python
keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton(
        "📅 Записаться", 
        web_app=WebAppInfo(f"https://test.2minutes.ru/book/first?startapp=user_{user_id}")
    )]
])
```

## 🔍 ЧТО ПОЛУЧИТ WEBAPP:

### ✅ Доступные данные:
- `user.id` - ID пользователя Telegram
- `user.first_name` - Имя
- `user.last_name` - Фамилия (опционально)
- `user.username` - Username (опционально)
- `user.language_code` - Язык интерфейса
- `user.is_premium` - Premium статус
- `start_param` - Параметры запуска

### ❌ НЕДоступные данные:
- `chat.id` - ID чата (недоступен в WebApp)
- Сообщения из чата
- История чата

## 🧪 ТЕСТИРОВАНИЕ:

1. **В Telegram:** Нажмите кнопку → смотрите debug панель
2. **Ожидаемый результат:**
   ```
   👤 User data received | Data: {
     "id": 123456789,
     "first_name": "Имя",
     "username": "username"
   }
   ```

## 🚨 ВАЖНО:

- **WebApp работает ТОЛЬКО через Telegram** (не в браузере)
- **Кнопка должна быть `web_app`**, не `url`
- **Mini App URL должен быть настроен в @BotFather**
- **HTTPS обязателен** для WebApp

## 🔧 ОТЛАДКА:

Если данные все еще не приходят:

1. **Проверьте URL в @BotFather**
2. **Убедитесь что используете `web_app`, не `url`**
3. **Тестируйте в реальном Telegram, не в браузере**
4. **Проверьте логи в WebApp debug панели**