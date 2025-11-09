-- Ensure PostAnalysisStatus enum exists for earlier migrations
DO $$
BEGIN
    CREATE TYPE "PostAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- CreateTable
CREATE TABLE "DivarPost" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'DIVAR',
    "externalId" TEXT NOT NULL,
    "readQueueId" TEXT NOT NULL,
    "analyzeQueueId" TEXT NOT NULL,
    "categoryId" TEXT,
    "categorySlug" TEXT NOT NULL,
    "cat1" TEXT,
    "cat2" TEXT,
    "cat3" TEXT,
    "title" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "displayTitle" TEXT,
    "displaySubtitle" TEXT,
    "shareTitle" TEXT,
    "shareUrl" TEXT,
    "permalink" TEXT,
    "description" TEXT,
    "contactUuid" TEXT,
    "businessType" TEXT,
    "conversionType" TEXT,
    "listedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "PostAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "priceTotal" DECIMAL(18,0),
    "pricePerSquare" DECIMAL(18,0),
    "depositAmount" DECIMAL(18,0),
    "rentAmount" DECIMAL(18,0),
    "dailyRateNormal" DECIMAL(18,0),
    "dailyRateWeekend" DECIMAL(18,0),
    "dailyRateHoliday" DECIMAL(18,0),
    "extraPersonFee" DECIMAL(18,0),
    "area" INTEGER,
    "areaLabel" TEXT,
    "landArea" INTEGER,
    "landAreaLabel" TEXT,
    "rooms" INTEGER,
    "roomsLabel" TEXT,
    "floor" INTEGER,
    "floorLabel" TEXT,
    "floorsCount" INTEGER,
    "unitPerFloor" INTEGER,
    "yearBuilt" INTEGER,
    "yearBuiltLabel" TEXT,
    "capacity" INTEGER,
    "capacityLabel" TEXT,
    "hasParking" BOOLEAN,
    "hasElevator" BOOLEAN,
    "hasWarehouse" BOOLEAN,
    "hasBalcony" BOOLEAN,
    "isRebuilt" BOOLEAN,
    "photosVerified" BOOLEAN,
    "imageCount" INTEGER,
    "latitude" DECIMAL(12,8),
    "longitude" DECIMAL(12,8),
    "provinceId" INTEGER,
    "provinceName" TEXT,
    "cityId" INTEGER,
    "citySlug" TEXT,
    "cityName" TEXT,
    "districtId" INTEGER,
    "districtSlug" TEXT,
    "districtName" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivarPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivarPostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "alt" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivarPostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivarPostAttribute" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "type" TEXT,
    "stringValue" TEXT,
    "numberValue" DECIMAL(18,2),
    "boolValue" BOOLEAN,
    "unit" TEXT,
    "rawValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivarPostAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DivarPost_externalId_key" ON "DivarPost"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "DivarPost_readQueueId_key" ON "DivarPost"("readQueueId");

-- CreateIndex
CREATE UNIQUE INDEX "DivarPost_analyzeQueueId_key" ON "DivarPost"("analyzeQueueId");

-- CreateIndex
CREATE INDEX "DivarPost_categoryId_idx" ON "DivarPost"("categoryId");

-- CreateIndex
CREATE INDEX "DivarPost_categorySlug_idx" ON "DivarPost"("categorySlug");

-- CreateIndex
CREATE INDEX "DivarPost_cityId_idx" ON "DivarPost"("cityId");

-- CreateIndex
CREATE INDEX "DivarPost_districtId_idx" ON "DivarPost"("districtId");

-- CreateIndex
CREATE INDEX "DivarPost_status_idx" ON "DivarPost"("status");

-- CreateIndex
CREATE INDEX "DivarPost_createdAt_idx" ON "DivarPost"("createdAt");

-- CreateIndex
CREATE INDEX "DivarPostMedia_postId_idx" ON "DivarPostMedia"("postId");

-- CreateIndex
CREATE INDEX "DivarPostAttribute_postId_idx" ON "DivarPostAttribute"("postId");

-- CreateIndex
CREATE INDEX "DivarPostAttribute_key_idx" ON "DivarPostAttribute"("key");

-- AddForeignKey
ALTER TABLE "DivarPost" ADD CONSTRAINT "DivarPost_readQueueId_fkey" FOREIGN KEY ("readQueueId") REFERENCES "PostToReadQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivarPostMedia" ADD CONSTRAINT "DivarPostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DivarPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivarPostAttribute" ADD CONSTRAINT "DivarPostAttribute_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DivarPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
