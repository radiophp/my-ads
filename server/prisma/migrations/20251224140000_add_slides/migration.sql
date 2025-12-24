-- CreateTable
CREATE TABLE "Slide" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "imageDesktopUrl" TEXT NOT NULL,
    "imageTabletUrl" TEXT,
    "imageMobileUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Slide_isActive_sortOrder_idx" ON "Slide"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Slide_createdAt_idx" ON "Slide"("createdAt");
