-- Set default nextFetchId to 10000
ALTER TABLE "ArkaPhoneCursor" ALTER COLUMN "nextFetchId" SET DEFAULT 10000;

-- Bump existing cursor if still at zero
UPDATE "ArkaPhoneCursor"
SET "nextFetchId" = 10000
WHERE "id" = 'singleton' AND "nextFetchId" < 10000;
