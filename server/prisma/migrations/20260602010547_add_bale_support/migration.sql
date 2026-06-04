-- CreateEnum
CREATE TYPE "NotificationBaleStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED', 'HAS_NOT_CONNECTED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "baleAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "baleError" TEXT,
ADD COLUMN     "baleStatus" "NotificationBaleStatus";

-- CreateTable
CREATE TABLE "BaleUserLink" (
    "baleId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaleUserLink_pkey" PRIMARY KEY ("baleId")
);

-- CreateIndex
CREATE INDEX "BaleUserLink_phone_idx" ON "BaleUserLink"("phone");

-- CreateIndex
CREATE INDEX "BaleUserLink_userId_idx" ON "BaleUserLink"("userId");

-- AddForeignKey
ALTER TABLE "BaleUserLink" ADD CONSTRAINT "BaleUserLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
