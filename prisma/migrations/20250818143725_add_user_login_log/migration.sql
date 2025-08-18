-- CreateTable
CREATE TABLE "public"."user_login_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_login_logs_createdAt_idx" ON "public"."user_login_logs"("createdAt");

-- CreateIndex
CREATE INDEX "user_login_logs_email_createdAt_idx" ON "public"."user_login_logs"("email", "createdAt");

-- CreateIndex
CREATE INDEX "user_login_logs_userId_createdAt_idx" ON "public"."user_login_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_login_logs_teamId_createdAt_idx" ON "public"."user_login_logs"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."user_login_logs" ADD CONSTRAINT "user_login_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_login_logs" ADD CONSTRAINT "user_login_logs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
