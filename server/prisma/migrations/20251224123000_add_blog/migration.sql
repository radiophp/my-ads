-- Create blog categories
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- Create blog sources
CREATE TABLE "BlogSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogSource_pkey" PRIMARY KEY ("id")
);

-- Create blog tags
CREATE TABLE "BlogTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogTag_pkey" PRIMARY KEY ("id")
);

-- Create blog items
CREATE TABLE "Blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortText" TEXT,
    "content" TEXT NOT NULL,
    "mainImageUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- Join table for blog tags
CREATE TABLE "BlogTagOnBlog" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogTagOnBlog_pkey" PRIMARY KEY ("id")
);

-- Indexes and unique constraints
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");
CREATE UNIQUE INDEX "BlogSource_slug_key" ON "BlogSource"("slug");
CREATE UNIQUE INDEX "BlogTag_slug_key" ON "BlogTag"("slug");
CREATE UNIQUE INDEX "Blog_slug_key" ON "Blog"("slug");
CREATE UNIQUE INDEX "BlogTagOnBlog_blogId_tagId_key" ON "BlogTagOnBlog"("blogId", "tagId");

CREATE INDEX "BlogCategory_isActive_idx" ON "BlogCategory"("isActive");
CREATE INDEX "BlogSource_isActive_idx" ON "BlogSource"("isActive");
CREATE INDEX "Blog_categoryId_idx" ON "Blog"("categoryId");
CREATE INDEX "Blog_sourceId_idx" ON "Blog"("sourceId");
CREATE INDEX "Blog_createdAt_idx" ON "Blog"("createdAt");
CREATE INDEX "BlogTagOnBlog_tagId_idx" ON "BlogTagOnBlog"("tagId");
CREATE INDEX "BlogTagOnBlog_blogId_idx" ON "BlogTagOnBlog"("blogId");

-- Foreign keys
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Blog" ADD CONSTRAINT "Blog_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "BlogSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BlogTagOnBlog" ADD CONSTRAINT "BlogTagOnBlog_blogId_fkey"
    FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlogTagOnBlog" ADD CONSTRAINT "BlogTagOnBlog_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "BlogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "BlogSource" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'ماهان فایل', 'mahanfile', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
