-- AlterTable
ALTER TABLE "public"."teams" ADD COLUMN     "ungroupedGroupName" TEXT NOT NULL DEFAULT 'Основные услуги';

-- CreateIndex
CREATE INDEX "bookings_teamId_startTime_idx" ON "public"."bookings"("teamId", "startTime");

-- CreateIndex
CREATE INDEX "bookings_masterId_startTime_idx" ON "public"."bookings"("masterId", "startTime");

-- CreateIndex
CREATE INDEX "bookings_status_startTime_idx" ON "public"."bookings"("status", "startTime");
