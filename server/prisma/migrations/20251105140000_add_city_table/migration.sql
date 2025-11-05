-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "cityId" INTEGER;

-- Seed cities from existing user data, if any
INSERT INTO "City" ("name", "createdAt", "updatedAt")
SELECT DISTINCT "city", NOW(), NOW()
FROM "User"
WHERE "city" IS NOT NULL
ON CONFLICT ("name") DO NOTHING;

-- Backfill user city references
UPDATE "User"
SET "cityId" = "City"."id"
FROM "City"
WHERE "User"."city" = "City"."name";

-- Drop old city column
ALTER TABLE "User" DROP COLUMN IF EXISTS "city";

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_cityId_idx" ON "User"("cityId");
