-- CreateTable
CREATE TABLE "SubscriptionPackage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "durationDays" INTEGER NOT NULL,
    "freeDays" INTEGER NOT NULL DEFAULT 0,
    "includedUsers" INTEGER NOT NULL DEFAULT 1,
    "actualPrice" DECIMAL(12,2) NOT NULL,
    "discountedPrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPackage_isActive_idx" ON "SubscriptionPackage"("isActive");
