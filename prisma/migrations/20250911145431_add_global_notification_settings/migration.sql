-- CreateTable
CREATE TABLE "global_notification_settings" (
    "id" TEXT NOT NULL,
    "maxRequestsPerMinute" INTEGER NOT NULL DEFAULT 25,
    "requestDelayMs" INTEGER NOT NULL DEFAULT 2000,
    "maxRetryAttempts" INTEGER NOT NULL DEFAULT 3,
    "retryDelayMs" INTEGER NOT NULL DEFAULT 5000,
    "exponentialBackoff" BOOLEAN NOT NULL DEFAULT true,
    "failureThreshold" INTEGER NOT NULL DEFAULT 5,
    "recoveryTimeoutMs" INTEGER NOT NULL DEFAULT 60000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "global_notification_settings_id_key" ON "global_notification_settings"("id");

-- Insert default settings
INSERT INTO "global_notification_settings" (
    "id",
    "maxRequestsPerMinute",
    "requestDelayMs",
    "maxRetryAttempts",
    "retryDelayMs",
    "exponentialBackoff",
    "failureThreshold",
    "recoveryTimeoutMs",
    "enabled",
    "createdAt",
    "updatedAt"
) VALUES (
    'global',
    25,
    2000,
    3,
    5000,
    true,
    5,
    60000,
    true,
    NOW(),
    NOW()
) ON CONFLICT ("id") DO NOTHING;
