-- Track last error for Arka sessions (e.g., expired/unauthorized)
ALTER TABLE "AdminArkaSession"
  ADD COLUMN IF NOT EXISTS "lastError" TEXT,
  ADD COLUMN IF NOT EXISTS "lastErrorAt" TIMESTAMP(3);
