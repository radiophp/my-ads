-- CreateTable
CREATE TABLE "FeaturedPost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedPost_postId_key" ON "FeaturedPost"("postId");

-- CreateIndex
CREATE INDEX "FeaturedPost_isActive_sortOrder_idx" ON "FeaturedPost"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "FeaturedPost" ADD CONSTRAINT "FeaturedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DivarPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
