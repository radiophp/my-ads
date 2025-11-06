-- Drop defaults that autogenerate IDs so we can seed Divar identifiers directly
ALTER TABLE "Province" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "City" ALTER COLUMN "id" DROP DEFAULT;

-- Add slug columns
ALTER TABLE "Province" ADD COLUMN     "slug" TEXT;
ALTER TABLE "City" ADD COLUMN         "slug" TEXT;

-- Temporary slug values for existing records
UPDATE "Province" SET "slug" = 'unknown' WHERE "slug" IS NULL;
UPDATE "City" SET "slug" = 'city-' || "id" WHERE "slug" IS NULL;

-- Enforce non-null and uniqueness
ALTER TABLE "Province" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "City" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Province_slug_key" ON "Province"("slug");
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- Districts table mirrors Divar districts
CREATE TABLE "District" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "District_cityId_slug_key" ON "District"("cityId", "slug");
CREATE UNIQUE INDEX "District_cityId_name_key" ON "District"("cityId", "name");
CREATE INDEX "District_slug_idx" ON "District"("slug");

ALTER TABLE "District" ADD CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
