-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "DivarPost" ADD COLUMN     "notificationsChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationsCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SavedFilter" ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savedFilterId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "payload" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_status_nextAttemptAt_idx" ON "Notification"("userId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "Notification_nextAttemptAt_idx" ON "Notification"("nextAttemptAt");

-- CreateIndex
CREATE INDEX "Notification_postId_idx" ON "Notification"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_savedFilterId_postId_key" ON "Notification"("userId", "savedFilterId", "postId");

-- CreateIndex
CREATE INDEX "DivarPost_notificationsChecked_createdAt_idx" ON "DivarPost"("notificationsChecked", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_savedFilterId_fkey" FOREIGN KEY ("savedFilterId") REFERENCES "SavedFilter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DivarPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
