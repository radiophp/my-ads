-- Add phone fetch tracking fields and indexes
CREATE TYPE "PhoneFetchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'FAILED');

ALTER TABLE "DivarPost"
  ADD COLUMN "phoneFetchStatus" "PhoneFetchStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "phoneFetchLockedUntil" TIMESTAMPTZ,
  ADD COLUMN "phoneFetchLeaseId" TEXT,
  ADD COLUMN "phoneFetchWorker" TEXT,
  ADD COLUMN "phoneFetchAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "phoneFetchLastError" TEXT;

CREATE INDEX "DivarPost_phoneNumber_idx" ON "DivarPost" ("phoneNumber");
CREATE INDEX "DivarPost_contactUuid_phoneNumber_idx" ON "DivarPost" ("contactUuid", "phoneNumber");
