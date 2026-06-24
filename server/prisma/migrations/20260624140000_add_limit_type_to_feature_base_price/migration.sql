ALTER TABLE "FeatureBasePrice" ADD COLUMN "limitType" TEXT NOT NULL DEFAULT 'OVERALL';

UPDATE "FeatureBasePrice" SET "limitType" = 'DAILY'
WHERE "featureKey" IN ('notifications_limit', 'zip_downloads_per_day', 'divar_drafts_per_day');
