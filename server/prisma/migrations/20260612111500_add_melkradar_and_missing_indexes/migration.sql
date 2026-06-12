-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminMelkradarArchive" (
    "id" TEXT NOT NULL,
    "archiveFolderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "persianSeason" TEXT NOT NULL,
    "persianYear" TEXT NOT NULL,
    "persianCityZoneTitle" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "quarter" TEXT NOT NULL,
    "cityZoneCode" TEXT,
    "year" TEXT,
    "isShared" BOOLEAN,
    "folderOwnerId" TEXT,
    "folderOwnerName" TEXT,
    "price" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastError" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "lastPageFetched" INTEGER NOT NULL DEFAULT 0,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "AdminMelkradarArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminMelkradarPost" (
    "id" TEXT NOT NULL,
    "archiveFolderId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "melkradarId" TEXT,
    "url" TEXT,
    "contactPhone" TEXT,
    "radarCode" TEXT,
    "sellTotalPrice" DECIMAL(65,30),
    "rentMonthlyPrice" DECIMAL(65,30),
    "rentMortgagePrice" DECIMAL(65,30),
    "sellUnitPrice" DECIMAL(65,30),
    "priceTypeStr" TEXT,
    "adverTypeTitle" TEXT,
    "estateTypeTitle" TEXT,
    "estateTypeGroupTitle" TEXT,
    "advertType" TEXT,
    "areaSize" DOUBLE PRECISION,
    "bedroomCount" INTEGER,
    "summary" TEXT,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isExactLocation" BOOLEAN,
    "cityAreaId" TEXT,
    "cityAreaTitle" TEXT,
    "cityAreaGroupTitle" TEXT,
    "hasParking" INTEGER,
    "hasElevator" INTEGER,
    "hasWarehouse" INTEGER,
    "hasBalcony" INTEGER,
    "floorNumber" INTEGER,
    "floorNumberStr" TEXT,
    "builtDate" TEXT,
    "calculatedBuildingAge" INTEGER,
    "isRenovatedByAI" BOOLEAN,
    "deedTypeByAI" TEXT,
    "directionByAI" TEXT,
    "unitsPerFloorByAI" INTEGER,
    "totalFloorsByAI" INTEGER,
    "phaseByAI" TEXT,
    "isLightingGoodByAI" BOOLEAN,
    "isActive" BOOLEAN,
    "adverDateTime" TIMESTAMP(3),
    "analysisDateTime" TIMESTAMP(3),
    "realtorAnalyzeDateTime" TIMESTAMP(3),
    "vendorImageUrls" JSONB,
    "adverImageUrls" JSONB,
    "imageCount" INTEGER,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AdminMelkradarPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminMelkradarSession" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'default',
    "headersRaw" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminMelkradarSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminMelkradarArchive_archiveFolderId_key" ON "AdminMelkradarArchive"("archiveFolderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminMelkradarArchive_syncStatus_idx" ON "AdminMelkradarArchive"("syncStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminMelkradarPost_archiveFolderId_idx" ON "AdminMelkradarPost"("archiveFolderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminMelkradarPost_source_externalId_idx" ON "AdminMelkradarPost"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminMelkradarPost_source_externalId_key" ON "AdminMelkradarPost"("source", "externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminMelkradarSession_active_locked_idx" ON "AdminMelkradarSession"("active", "locked");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DivarCategory_depth_active_posting_idx" ON "DivarCategory"("depth", "isActive", "allowPosting");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DivarPost_cat1_idx" ON "DivarPost"("cat1");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DivarPost_cat2_idx" ON "DivarPost"("cat2");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DivarPost_provinceId_publishedAt_idx" ON "DivarPost"("provinceId", "publishedAt" DESC NULLS LAST, "createdAt" DESC, "id" DESC);
