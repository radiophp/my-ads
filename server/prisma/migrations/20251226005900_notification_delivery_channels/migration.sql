-- CreateEnum
CREATE TYPE "NotificationChannelStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "NotificationTelegramStatus" ADD VALUE 'QUEUED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "pushAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pushError" TEXT,
ADD COLUMN     "pushStatus" "NotificationChannelStatus",
ADD COLUMN     "telegramAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "websocketAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "websocketError" TEXT,
ADD COLUMN     "websocketStatus" "NotificationChannelStatus";

-- CreateIndex
CREATE INDEX "DivarPost_categorySlug_createdAt_districtId_idx" ON "DivarPost"("categorySlug", "createdAt", "districtId");

-- CreateIndex
CREATE INDEX "DivarPost_cat3_createdAt_districtId_idx" ON "DivarPost"("cat3", "createdAt", "districtId");
