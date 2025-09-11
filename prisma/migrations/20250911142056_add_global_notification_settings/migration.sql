-- CreateTable
CREATE TABLE "global_notification_settings" (
    "id" TEXT NOT NULL,
    "max_requests_per_minute" INTEGER NOT NULL DEFAULT 25,
    "request_delay_ms" INTEGER NOT NULL DEFAULT 2000,
    "max_retry_attempts" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 5000,
    "exponential_backoff" BOOLEAN NOT NULL DEFAULT true,
    "failure_threshold" INTEGER NOT NULL DEFAULT 5,
    "recovery_timeout_ms" INTEGER NOT NULL DEFAULT 60000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "global_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_notification_settings_id_key" ON "global_notification_settings"("id");

-- Insert default data
INSERT INTO "global_notification_settings" (
    "id", "max_requests_per_minute", "request_delay_ms", "max_retry_attempts",
    "retry_delay_ms", "exponential_backoff", "failure_threshold",
    "recovery_timeout_ms", "enabled", "created_at", "updated_at"
) VALUES (
    'global', 25, 2000, 3, 5000, true, 5, 60000, true, NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;
