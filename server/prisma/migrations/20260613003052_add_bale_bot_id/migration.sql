-- DropIndex
DROP INDEX "public"."DivarCategory_depth_active_posting_idx";

-- DropIndex
DROP INDEX "public"."DivarPost_cat1_idx";

-- DropIndex
DROP INDEX "public"."DivarPost_cat2_idx";

-- AlterTable
ALTER TABLE "BaleUserLink" ADD COLUMN     "botId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "BaleUserLink_botId_idx" ON "BaleUserLink"("botId");

-- CreateIndex
CREATE INDEX "DivarPost_provinceId_cityId_publishedAt_createdAt_id_idx" ON "DivarPost"("provinceId", "cityId", "publishedAt" DESC, "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "DivarPost_cityId_publishedAt_createdAt_id_idx" ON "DivarPost"("cityId", "publishedAt" DESC, "createdAt" DESC, "id" DESC);

-- RenameIndex
ALTER INDEX "DivarPost_provinceId_publishedAt_idx" RENAME TO "DivarPost_provinceId_publishedAt_createdAt_id_idx";
