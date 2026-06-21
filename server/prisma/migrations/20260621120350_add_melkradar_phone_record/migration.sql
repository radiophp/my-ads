-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MelkradarTransferStatus" AS ENUM ('NOT_TRANSFERRED', 'IN_PROGRESS', 'TRANSFERRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "MelkradarPhoneRecord" (
    "id" TEXT NOT NULL,
    "melkradarId" TEXT NOT NULL,
    "externalId" TEXT,
    "phoneNumber" TEXT,
    "radarCode" TEXT,
    "payload" JSONB,
    "status" "MelkradarTransferStatus" NOT NULL DEFAULT 'NOT_TRANSFERRED',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredAt" TIMESTAMP(3),
    "transferLockedUntil" TIMESTAMP(3),
    "transferAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextTransferAttemptAt" TIMESTAMP(3),
    "transferLastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MelkradarPhoneRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MelkradarPhoneRecord_melkradarId_key" ON "MelkradarPhoneRecord"("melkradarId");

-- CreateIndex
CREATE INDEX "MelkradarPhoneRecord_status_fetchedAt_idx" ON "MelkradarPhoneRecord"("status", "fetchedAt");

-- CreateIndex
CREATE INDEX "MelkradarPhoneRecord_externalId_idx" ON "MelkradarPhoneRecord"("externalId");

-- CreateIndex
CREATE INDEX "MelkradarPhoneRecord_transferLockedUntil_idx" ON "MelkradarPhoneRecord"("transferLockedUntil");

-- CreateIndex
CREATE INDEX "DivarCategory_depth_active_posting_idx" ON "DivarCategory"("depth", "isActive", "allowPosting");

-- CreateIndex
CREATE INDEX "DivarPost_cat1_idx" ON "DivarPost"("cat1");

-- CreateIndex
CREATE INDEX "DivarPost_cat2_idx" ON "DivarPost"("cat2");

-- CreateIndex
CREATE INDEX "PostToReadQueue_status_requestedAt_idx" ON "PostToReadQueue"("status", "requestedAt");

-- RenameIndex
ALTER INDEX "DivarPost_cityId_publishedAt_createdAt_id_idx" RENAME TO "DivarPost_cityId_publishedAt_idx";

-- RenameIndex
ALTER INDEX "DivarPost_provinceId_cityId_publishedAt_createdAt_id_idx" RENAME TO "DivarPost_provinceId_cityId_publishedAt_idx";

-- RenameIndex
ALTER INDEX "DivarPost_provinceId_publishedAt_createdAt_id_idx" RENAME TO "DivarPost_provinceId_publishedAt_idx";
