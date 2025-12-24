-- Create news sources
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsSource_slug_key" ON "NewsSource"("slug");
CREATE INDEX "NewsSource_isActive_idx" ON "NewsSource"("isActive");

-- Add source reference to news
ALTER TABLE "News" ADD COLUMN "sourceId" TEXT;

INSERT INTO "NewsSource" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'اقتصاد آنلاین', 'eghtesadonline', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'خبرآنلاین', 'khabaronline', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'عصر ایران', 'asriran', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ماهان فایل', 'mahanfile', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "News"
SET "sourceId" = (SELECT "id" FROM "NewsSource" WHERE "slug" = 'mahanfile')
WHERE "sourceId" IS NULL;

ALTER TABLE "News" ALTER COLUMN "sourceId" SET NOT NULL;

CREATE INDEX "News_sourceId_idx" ON "News"("sourceId");

ALTER TABLE "News" ADD CONSTRAINT "News_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
