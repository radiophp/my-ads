-- CreateEnum
CREATE TYPE "ArkaTransferStatus" AS ENUM ('NOT_TRANSFERRED', 'IN_PROGRESS', 'TRANSFERRED');

-- AlterTable
ALTER TABLE "AdminDivarSession" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BusinessPhoneCache" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "fetchedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lockedUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "titleFetchedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DivarPost" ALTER COLUMN "phoneFetchLockedUntil" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PushSubscription" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdminArkaSession" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'default',
    "headersRaw" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminArkaSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArkaPhoneCursor" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nextFetchId" INTEGER NOT NULL DEFAULT 0,
    "backoffUntil" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastStatus" INTEGER,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArkaPhoneCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArkaPhoneRecord" (
    "id" TEXT NOT NULL,
    "arkaId" INTEGER NOT NULL,
    "divarLink" TEXT,
    "externalId" TEXT,
    "phoneNumber" TEXT,
    "malkName" TEXT,
    "payload" JSONB,
    "status" "ArkaTransferStatus" NOT NULL DEFAULT 'NOT_TRANSFERRED',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredAt" TIMESTAMP(3),
    "transferLockedUntil" TIMESTAMP(3),
    "transferAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextTransferAttemptAt" TIMESTAMP(3),
    "transferLastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArkaPhoneRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminArkaSession_active_locked_idx" ON "AdminArkaSession"("active", "locked");

-- CreateIndex
CREATE UNIQUE INDEX "ArkaPhoneRecord_arkaId_key" ON "ArkaPhoneRecord"("arkaId");

-- CreateIndex
CREATE INDEX "ArkaPhoneRecord_status_fetchedAt_idx" ON "ArkaPhoneRecord"("status", "fetchedAt");

-- CreateIndex
CREATE INDEX "ArkaPhoneRecord_externalId_idx" ON "ArkaPhoneRecord"("externalId");

-- CreateIndex
CREATE INDEX "ArkaPhoneRecord_transferLockedUntil_idx" ON "ArkaPhoneRecord"("transferLockedUntil");
