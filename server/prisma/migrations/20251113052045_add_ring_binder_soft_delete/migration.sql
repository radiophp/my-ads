-- Drop previous unique constraint on (userId, name)
DROP INDEX IF EXISTS "RingBinderFolder_userId_name_key";

-- Add soft-delete column
ALTER TABLE "RingBinderFolder"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add new unique constraint scoped by deletedAt
CREATE UNIQUE INDEX IF NOT EXISTS "RingBinderFolder_userId_name_deletedAt_key"
  ON "RingBinderFolder"("userId", "name", "deletedAt");

-- Additional index to speed up queries filtering on deletedAt
CREATE INDEX IF NOT EXISTS "RingBinderFolder_userId_deletedAt_idx"
  ON "RingBinderFolder"("userId", "deletedAt");
