-- CreateTable
CREATE TABLE "TelegramUserLink" (
    "telegramId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramUserLink_pkey" PRIMARY KEY ("telegramId")
);

-- AddForeignKey
ALTER TABLE "TelegramUserLink" ADD CONSTRAINT "TelegramUserLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "TelegramUserLink_phone_idx" ON "TelegramUserLink"("phone");
CREATE INDEX "TelegramUserLink_userId_idx" ON "TelegramUserLink"("userId");
