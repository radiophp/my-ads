-- CreateTable
CREATE TABLE "Province" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_key" ON "Province"("name");

-- Seed default province for existing cities
INSERT INTO "Province" ("name", "createdAt", "updatedAt")
VALUES ('Unknown', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Drop existing city name unique constraint
DROP INDEX IF EXISTS "City_name_key";

-- AlterTable
ALTER TABLE "City" ADD COLUMN "provinceId" INTEGER;

-- Backfill city province references
UPDATE "City"
SET "provinceId" = (
  SELECT "id" FROM "Province" WHERE "name" = 'Unknown'
)
WHERE "provinceId" IS NULL;

-- Ensure provinceId is required
ALTER TABLE "City"
ALTER COLUMN "provinceId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "City"
ADD CONSTRAINT "City_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "City_provinceId_idx" ON "City"("provinceId");
CREATE UNIQUE INDEX "City_name_provinceId_key" ON "City"("name", "provinceId");
