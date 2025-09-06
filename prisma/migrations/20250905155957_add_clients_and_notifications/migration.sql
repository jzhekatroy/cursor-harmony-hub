-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('TELEGRAM_WEBAPP', 'PUBLIC_PAGE', 'ADMIN_CREATED');

-- CreateEnum
CREATE TYPE "ClientActionType" AS ENUM ('PAGE_VIEW', 'SERVICE_SELECT', 'BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'PAYMENT_COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Сначала создаем новые таблицы
-- CreateTable
CREATE TABLE "client_actions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "action_type" "ClientActionType" NOT NULL,
    "page_url" TEXT,
    "service_id" TEXT,
    "booking_id" TEXT,
    "telegram_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "telegram_bot_token" TEXT,
    "telegram_webhook_url" TEXT,
    "send_booking_confirmation" BOOLEAN NOT NULL DEFAULT true,
    "send_booking_cancellation" BOOLEAN NOT NULL DEFAULT true,
    "send_booking_reschedule" BOOLEAN NOT NULL DEFAULT true,
    "send_reminders" BOOLEAN NOT NULL DEFAULT true,
    "reminder_hours_before" INTEGER NOT NULL DEFAULT 24,
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "booking_confirmation_template" TEXT,
    "booking_cancellation_template" TEXT,
    "booking_reschedule_template" TEXT,
    "reminder_template" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "execute_at" TIMESTAMP(3) NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_errors" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "team_id" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "telegram_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_errors_pkey" PRIMARY KEY ("id")
);

-- Теперь обновляем существующую таблицу clients
-- Добавляем новые колонки с значениями по умолчанию
ALTER TABLE "clients" ADD COLUMN "telegram_id" BIGINT;
ALTER TABLE "clients" ADD COLUMN "telegram_username" TEXT;
ALTER TABLE "clients" ADD COLUMN "telegram_first_name" TEXT;
ALTER TABLE "clients" ADD COLUMN "telegram_last_name" TEXT;
ALTER TABLE "clients" ADD COLUMN "telegram_language_code" TEXT;
ALTER TABLE "clients" ADD COLUMN "first_name" TEXT;
ALTER TABLE "clients" ADD COLUMN "last_name" TEXT;
ALTER TABLE "clients" ADD COLUMN "vk_id" TEXT;
ALTER TABLE "clients" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "clients" ADD COLUMN "instagram" TEXT;
ALTER TABLE "clients" ADD COLUMN "source" "ClientSource" NOT NULL DEFAULT 'TELEGRAM_WEBAPP';
ALTER TABLE "clients" ADD COLUMN "last_activity" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "notifications_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "clients" ADD COLUMN "preferred_language" TEXT NOT NULL DEFAULT 'ru';
ALTER TABLE "clients" ADD COLUMN "daily_booking_limit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "clients" ADD COLUMN "is_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN "telegram_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN "telegram_error_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clients" ADD COLUMN "last_telegram_error" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "telegram_error_reason" TEXT;

-- Копируем данные из старых колонок в новые
UPDATE "clients" SET 
    "first_name" = "firstName",
    "last_name" = "lastName",
    "telegram_username" = "telegram"
WHERE "firstName" IS NOT NULL OR "lastName" IS NOT NULL OR "telegram" IS NOT NULL;

-- Переименовываем teamId в team_id
ALTER TABLE "clients" RENAME COLUMN "teamId" TO "team_id";

-- Переименовываем createdAt в created_at
ALTER TABLE "clients" RENAME COLUMN "createdAt" TO "created_at";

-- Переименовываем updatedAt в updated_at
ALTER TABLE "clients" RENAME COLUMN "updatedAt" TO "updated_at";

-- Удаляем старые колонки
ALTER TABLE "clients" DROP COLUMN "firstName";
ALTER TABLE "clients" DROP COLUMN "lastName";
ALTER TABLE "clients" DROP COLUMN "telegram";

-- Создаем индексы
CREATE UNIQUE INDEX "clients_telegram_id_key" ON "clients"("telegram_id");
CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");
CREATE INDEX "client_actions_team_id_idx" ON "client_actions"("team_id");
CREATE INDEX "client_actions_client_id_idx" ON "client_actions"("client_id");
CREATE INDEX "client_actions_created_at_idx" ON "client_actions"("created_at");
CREATE INDEX "notification_queue_status_idx" ON "notification_queue"("status");
CREATE INDEX "notification_queue_execute_at_idx" ON "notification_queue"("execute_at");
CREATE INDEX "telegram_errors_team_id_idx" ON "telegram_errors"("team_id");
CREATE INDEX "telegram_errors_client_id_idx" ON "telegram_errors"("client_id");

-- Создаем внешние ключи
ALTER TABLE "client_actions" ADD CONSTRAINT "client_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_actions" ADD CONSTRAINT "client_actions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_actions" ADD CONSTRAINT "client_actions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client_actions" ADD CONSTRAINT "client_actions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telegram_errors" ADD CONSTRAINT "telegram_errors_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "telegram_errors" ADD CONSTRAINT "telegram_errors_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Обновляем внешние ключи для bookings
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_clientId_fkey";
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
