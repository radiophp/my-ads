-- CreateTable
CREATE TABLE "DivarCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayPath" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parentId" TEXT,
    "depth" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivarCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DivarCategory_slug_key" ON "DivarCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DivarCategory_path_key" ON "DivarCategory"("path");

-- CreateIndex
CREATE INDEX "DivarCategory_parentId_idx" ON "DivarCategory"("parentId");

-- CreateIndex
CREATE INDEX "DivarCategory_isActive_idx" ON "DivarCategory"("isActive");

-- AddForeignKey
ALTER TABLE "DivarCategory"
  ADD CONSTRAINT "DivarCategory_parentId_fkey"
  FOREIGN KEY ("parentId")
  REFERENCES "DivarCategory"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
