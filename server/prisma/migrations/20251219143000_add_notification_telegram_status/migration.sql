-- CreateEnum
CREATE TYPE "NotificationTelegramStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'HAS_NOT_CONNECTED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "telegramStatus" "NotificationTelegramStatus";
