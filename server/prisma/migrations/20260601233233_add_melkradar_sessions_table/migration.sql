-- CreateTable
CREATE TABLE "AdminMelkradarSession" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'default',
    "headersRaw" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMelkradarSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminMelkradarSession_active_locked_idx" ON "AdminMelkradarSession"("active", "locked");
