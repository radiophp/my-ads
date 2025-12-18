-- Add optional ownerName to Divar posts for storing contact names
ALTER TABLE "DivarPost" ADD COLUMN IF NOT EXISTS "ownerName" TEXT;
