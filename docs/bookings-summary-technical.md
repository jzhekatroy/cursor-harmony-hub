### Сводка по бронированиям — техническая документация

### Обзор
Страница `Сводка по бронированиям` реализована в `src/app/admin/bookings/page.tsx` и предназначена для оперативной аналитики по бронированиям за выбранный период. Сводная информация и ежедневные ряды считаются на сервере и возвращают сразу и количество, и суммы. Список бронирований загружается отдельно по кнопке и не влияет на сводные данные.

### Эндпоинты и контракты
- `GET /api/bookings` — список бронирований (ленивая загрузка). Перед началом обработчик выполняет авто‑апдейт: все `CONFIRMED` c `endTime < now()` переводятся в `COMPLETED`.

- `GET /api/bookings/summary` — сводка по статусам в интервале.
  - Параметры: `from` (ISO), `to` (ISO), `masterIds` (csv), `serviceIds` (csv), `status` (csv).
  - Возвращает: `{ summary: { [BookingStatus]: { count: number, amount: number } } }`.
  - В начале также выполняется авто‑апдейт `CONFIRMED → COMPLETED` для прошедших бронирований.

- `GET /api/bookings/summary/daily` — дневные агрегаты для графиков.
  - Параметры: `from` (ISO), `to` (ISO), `masterIds` (csv), `serviceIds` (csv), `status` (csv).
  - Возвращает массив точек по датам: `[{ date: string, count: number, revenueSalon: number, revenueLost: number }]`.
  - `revenueSalon = COMPLETED.amount + (NEW + CONFIRMED).amount`, `revenueLost = NO_SHOW + CANCELLED_BY_CLIENT + CANCELLED_BY_SALON`.
  - Учтён фильтр `serviceIds` для `count` (важно для корректной фильтрации по услугам).

### Временные зоны и вычисление периодов
- Используется часовой пояс салона из `GET /api/team/settings`.
- Утилиты `createDateInSalonTimezone` и `formatTimeForAdmin` (см. `src/lib/timezone.ts`).
- Режимы периода: `day`, `week`, `month`, `range`.
  - Неделя начинается с понедельника в TZ салона.
  - Для каждого режима формируется полуоткрытый интервал 
    \[startUtc, endUtc) в TZ салона и передаётся на сервер.

### Клиентская часть: состояния и потоки данных
- Основные состояния: 
  - `viewMode`, `anchorDate`, `rangeStartStr`, `rangeEndStr`, `salonTimezone`.
  - Доп. фильтры: `selectedStatuses`, `selectedMasterIds`, `selectedServiceIds`, `includeDismissedMasters`, `includeArchivedServices`.
  - Сводка: `summary`, `summaryLoading`.
  - Графики: `dailySeries`, `dailyLoading`, `graphGroupBy` (`day|week|month`).
  - Список: `bookings`, `bookingsLoaded`, `bookingsLoading`.

- Загрузка сводки (`/api/bookings/summary`) и дневных рядов (`/api/bookings/summary/daily`) происходит при изменении периода, TZ или доп. фильтров. Для актуальности:
  - Все запросы помечены `cache: 'no-store'`.
  - К URL добавляется параметр `t=${Date.now()}` для cache‑busting.

### Мини‑графики (SVG)
- Всегда видны, два графика:
  - Количество бронирований по дням (синяя линия).
  - Выручка салона (зелёная) и упущенная (красная).
- Высота 80px, ноль Y совпадает с низом; добавлены горизонтальные линии сетки.
- Подписи осей и тики:
  - Y: 0, середина, максимум, вынесены вне области графика, мелким шрифтом.
  - X: подписи дат для начала, середины и конца диапазона, вынесены вне графика.
- Группировка `graphGroupBy`: 
  - `day` — прямое отображение.
  - `week` — суммирование по неделям (ключ — понедельник недели в TZ салона).
  - `month` — суммирование по месяцам.
  - См. функцию `aggregateGraphSeries()` в `src/app/admin/bookings/page.tsx`.

### Сводная таблица
- Заголовок формируется функцией `getSummaryTitle()`.
- Отображаются все актуальные статусы, для каждого — `count` и `amount`.
- "Выручка салона" = `COMPLETED.amount + (NEW + CONFIRMED).amount` с разбивкой "Фактическая" и "Планируемая".
- "Упущенная выручка" = `NO_SHOW + CANCELLED_BY_CLIENT + CANCELLED_BY_SALON` (amount).

### Дополнительные фильтры
- Мультивыбор в `Статус`, `Мастера`, `Услуги` (Cmd/Ctrl + клик). 
- Переключатели: "Показать уволенных", "Показать архивные услуги".
- Кнопка "Очистить все доп. фильтры" внутри блока, индикатор активных фильтров — красная кнопка‑сброс при свёрнутом блоке.

### Список бронирований (ленивая загрузка)
- По умолчанию не загружается. Кнопка: "Загрузить список" / "Обновить список".
- На изменения сводки/графиков список не влияет; они получают агрегаты напрямую с сервера.
- Таблица: `sticky` заголовок, адаптивные ширины колонок без горизонтального скролла.

### Автоматический переход CONFIRMED → COMPLETED
- Реализован в начале обработчиков `GET /api/bookings`, `GET /api/bookings/summary`:
  - `updateMany` меняет все `CONFIRMED` с `endTime < now()` на `COMPLETED`.
  - Это гарантирует консистентность при чтении и расчётах.

### Безопасность и производительность
- Авторизация: Bearer‑токен из `localStorage`.
- Минимизация лишних перерисовок: отдельные флаги загрузки для сводки, графов и списка.
- Для больших объёмов данных предусмотрен скрипт генерации тестовых данных `scripts/seed_analytics.js`.

### Основные файлы
- `src/app/admin/bookings/page.tsx` — UI, фильтры, сводка, графики, список.
- `src/app/api/bookings/summary/route.ts` — агрегирование по статусам.
- `src/app/api/bookings/summary/daily/route.ts` — дневные агрегаты для графиков.
- `src/lib/timezone.ts` — утилиты TZ и форматирования дат.


