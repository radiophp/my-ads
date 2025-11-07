-- CreateTable
CREATE TABLE "DivarCategoryFilter" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivarCategoryFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DivarCategoryFilter_categoryId_key" ON "DivarCategoryFilter"("categoryId");

-- AddForeignKey
ALTER TABLE "DivarCategoryFilter" ADD CONSTRAINT "DivarCategoryFilter_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DivarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
