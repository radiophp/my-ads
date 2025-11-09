-- CreateEnum
CREATE TYPE "PostQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "QueueLocationScope" AS ENUM ('CITY', 'PROVINCE');

-- CreateTable
CREATE TABLE "PostToReadQueue" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'DIVAR',
    "externalId" TEXT NOT NULL,
    "categoryId" TEXT,
    "categorySlug" TEXT NOT NULL,
    "locationScope" "QueueLocationScope" NOT NULL DEFAULT 'CITY',
    "provinceId" INTEGER,
    "cityId" INTEGER,
    "payload" JSONB,
    "status" "PostQueueStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostToReadQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostToReadQueue_categoryId_idx" ON "PostToReadQueue"("categoryId");

-- CreateIndex
CREATE INDEX "PostToReadQueue_provinceId_idx" ON "PostToReadQueue"("provinceId");

-- CreateIndex
CREATE INDEX "PostToReadQueue_cityId_idx" ON "PostToReadQueue"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "PostToReadQueue_source_externalId_key" ON "PostToReadQueue"("source", "externalId");
