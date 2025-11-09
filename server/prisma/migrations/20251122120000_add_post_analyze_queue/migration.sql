-- CreateEnum
CREATE TYPE "PostAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

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
