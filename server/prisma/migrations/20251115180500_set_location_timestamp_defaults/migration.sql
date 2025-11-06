-- Backfill missing timestamps to avoid null constraint violations
UPDATE "Province" SET "createdAt" = COALESCE("createdAt", NOW()), "updatedAt" = NOW() WHERE "updatedAt" IS NULL OR "createdAt" IS NULL;
UPDATE "City" SET "createdAt" = COALESCE("createdAt", NOW()), "updatedAt" = NOW() WHERE "updatedAt" IS NULL OR "createdAt" IS NULL;
UPDATE "District" SET "createdAt" = COALESCE("createdAt", NOW()), "updatedAt" = NOW() WHERE "updatedAt" IS NULL OR "createdAt" IS NULL;

-- Ensure timestamps auto-populate on insert
ALTER TABLE "Province"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "City"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "District"
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
