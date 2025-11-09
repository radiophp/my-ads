-- CreateEnum (guarded to avoid duplicate when enum already exists)
DO $$
BEGIN
    CREATE TYPE "PostAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- AlterTable
ALTER TABLE "PostToReadQueue" ADD COLUMN     "fetchAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFetchedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PostToAnalyzeQueue" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'DIVAR',
    "externalId" TEXT NOT NULL,
    "readQueueId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "PostAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostToAnalyzeQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostToAnalyzeQueue_readQueueId_key" ON "PostToAnalyzeQueue"("readQueueId");

-- CreateIndex
CREATE UNIQUE INDEX "PostToAnalyzeQueue_source_externalId_key" ON "PostToAnalyzeQueue"("source", "externalId");

-- AddForeignKey
ALTER TABLE "PostToReadQueue" ADD CONSTRAINT "PostToReadQueue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DivarCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostToReadQueue" ADD CONSTRAINT "PostToReadQueue_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostToReadQueue" ADD CONSTRAINT "PostToReadQueue_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostToAnalyzeQueue" ADD CONSTRAINT "PostToAnalyzeQueue_readQueueId_fkey" FOREIGN KEY ("readQueueId") REFERENCES "PostToReadQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (Divar posts link to analyze queue once table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'DivarPost'
          AND column_name = 'analyzeQueueId'
    ) THEN
        ALTER TABLE "DivarPost"
        ADD CONSTRAINT "DivarPost_analyzeQueueId_fkey"
        FOREIGN KEY ("analyzeQueueId") REFERENCES "PostToAnalyzeQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey (Divar posts optional relations when backing tables exist)
ALTER TABLE "DivarPost" ADD CONSTRAINT "DivarPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DivarCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DivarPost" ADD CONSTRAINT "DivarPost_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DivarPost" ADD CONSTRAINT "DivarPost_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DivarPost" ADD CONSTRAINT "DivarPost_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
