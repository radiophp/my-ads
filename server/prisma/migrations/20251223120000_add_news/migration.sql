-- Create news categories
CREATE TABLE "NewsCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsCategory_pkey" PRIMARY KEY ("id")
);

-- Create news tags
CREATE TABLE "NewsTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsTag_pkey" PRIMARY KEY ("id")
);

-- Create news items
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortText" TEXT,
    "content" TEXT NOT NULL,
    "mainImageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- Join table for news tags
CREATE TABLE "NewsTagOnNews" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsTagOnNews_pkey" PRIMARY KEY ("id")
);

-- Indexes and unique constraints
CREATE UNIQUE INDEX "NewsCategory_slug_key" ON "NewsCategory"("slug");
CREATE UNIQUE INDEX "NewsTag_slug_key" ON "NewsTag"("slug");
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");
CREATE UNIQUE INDEX "NewsTagOnNews_newsId_tagId_key" ON "NewsTagOnNews"("newsId", "tagId");

CREATE INDEX "NewsCategory_isActive_idx" ON "NewsCategory"("isActive");
CREATE INDEX "News_categoryId_idx" ON "News"("categoryId");
CREATE INDEX "News_createdAt_idx" ON "News"("createdAt");
CREATE INDEX "NewsTagOnNews_tagId_idx" ON "NewsTagOnNews"("tagId");
CREATE INDEX "NewsTagOnNews_newsId_idx" ON "NewsTagOnNews"("newsId");

-- Foreign keys
ALTER TABLE "News" ADD CONSTRAINT "News_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "NewsCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NewsTagOnNews" ADD CONSTRAINT "NewsTagOnNews_newsId_fkey"
    FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NewsTagOnNews" ADD CONSTRAINT "NewsTagOnNews_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "NewsTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
