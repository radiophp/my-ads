-- Add isActive column to SavedFilter for soft limit enforcement
ALTER TABLE "SavedFilter"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
