### БОГ‑админка — техническая документация

#### Архитектура
- UI: `src/app/superadmin/layout.tsx`, `src/app/superadmin/page.tsx`, `src/app/superadmin/users/page.tsx`.
- API: `src/app/api/superadmin/teams/route.ts`, `src/app/api/superadmin/teams/[id]/status/route.ts`, `src/app/api/superadmin/users/route.ts`, `src/app/api/superadmin/users/[id]/role/route.ts`, `src/app/api/superadmin/impersonate/route.ts`.
- Аутентификация: JWT (`Authorization: Bearer <token>`), проверка роли `SUPER_ADMIN` на всех эндпоинтах супер‑админки.
- Имперсонация: генерация временного токена с полем `impersonatedBy`.

#### Модель данных (Prisma)
- Роли: `UserRole = { SUPER_ADMIN, ADMIN, MASTER }`.
- Статусы команды: `TeamStatus = { ACTIVE, DISABLED }`.
- Поля отключения команды: `disabledReason?: string`, `disabledAt?: DateTime`.

#### Гарды доступа
- Клиентский guard: `src/app/superadmin/layout.tsx` — при отсутствии токена или неправильной роли редирект на `/login` до рендера UI.
- Серверные проверки: на всех эндпоинтах супер‑админки — проверка токена и роли (`SUPER_ADMIN`).

#### Эндпоинты
- `GET /api/superadmin/teams?q=&page=1&pageSize=20`
  - Требует `SUPER_ADMIN`.
  - Поиск: `teamNumber`, `email`, `name`, `contactPerson`.
  - Ответ: список команд и счётчики `mastersCount`, `clientsCount`, `bookingsCount`.

- `PUT /api/superadmin/teams/:id/status`
  - Вход: `{ status: 'ACTIVE' | 'DISABLED', reason?: string }`.
  - Побочный эффект: при `DISABLED` заполняются `disabledReason`, `disabledAt`; при `ACTIVE` — оба поля очищаются.
  - Публичная запись: `GET /api/teams/[slug]` возвращает 403 для `DISABLED`.

- `GET /api/superadmin/users?q=&page=1&pageSize=20`
  - Поиск по `email` и `team.teamNumber`.
  - Ответ: `{ users: [{ id, email, role, isActive, lastLoginAt, team: { id, name, teamNumber } }], total }`.

- `PUT /api/superadmin/users/:id/role`
  - Вход: `{ role: 'ADMIN' | 'MASTER' }`.
  - Валидация: запрещено изменять роль пользователя с `SUPER_ADMIN`.

- `POST /api/superadmin/impersonate`
  - Вход: `{ teamId: string }`.
  - Находит первого `ADMIN` команды и выпускает токен: payload `{ userId: <adminId>, impersonatedBy: <superAdminId> }`, TTL 1h.
  - Клиентская часть сохраняет исходный токен в `sessionStorage.superadmin_original_token` и устанавливает временный токен в `localStorage.token`, затем редиректит в `/admin`.
  - В админ‑панели показывается плашка с кнопкой возврата (восстанавливает исходный токен из `sessionStorage`).

#### UI‑детали
- `src/app/superadmin/page.tsx` (Команды):
  - Поиск, таблица, пагинация, кнопки «Отключить»/«Включить», «Войти как админ».
  - Все запросы снабжены `Authorization` и `cache: 'no-store'`.

- `src/app/superadmin/users/page.tsx` (Пользователи):
  - Поиск, таблица, пагинация, смена роли через `<select>`.
  - Нельзя понизить `SUPER_ADMIN` — в UI показывается плашка без селекта.

#### Безопасность и ошибки
- Все эндпоинты оборачивают ошибки в `{ error, status }`, логируют серверные исключения.
- Неверный JSON → 400, нет токена → 401, недостаточно прав → 403, сущность не найдена → 404.
- Имперсонация ограничивается 1 часом действия токена.

#### Скрипты
- `node scripts/assign-super-admin.js <email>` — присваивает пользователю роль `SUPER_ADMIN`.

#### Редиректы
- После логина пользователи отправляются в `/admin`. Доступ к `/superadmin` контролируется guard'ом; при наличии роли `SUPER_ADMIN` можно открывать `/superadmin` напрямую.


