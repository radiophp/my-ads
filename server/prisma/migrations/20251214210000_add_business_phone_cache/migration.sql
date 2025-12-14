-- Add business ref and cache table
ALTER TABLE "DivarPost" ADD COLUMN "businessRef" TEXT;

CREATE TABLE "BusinessPhoneCache" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "businessRef" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "lockedUntil" TIMESTAMPTZ,
    CONSTRAINT "BusinessPhoneCache_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessPhoneCache_businessRef_key" UNIQUE ("businessRef")
);

CREATE INDEX "DivarPost_businessRef_idx" ON "DivarPost" ("businessRef");
