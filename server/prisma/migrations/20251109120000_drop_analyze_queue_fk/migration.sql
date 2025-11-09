-- Remove analyzeQueueId FK and column to keep analyze queue rows intact when deleting normalized posts
ALTER TABLE "DivarPost" DROP CONSTRAINT IF EXISTS "DivarPost_analyzeQueueId_fkey";

DROP INDEX IF EXISTS "DivarPost_analyzeQueueId_key";

ALTER TABLE "DivarPost" DROP COLUMN IF EXISTS "analyzeQueueId";
