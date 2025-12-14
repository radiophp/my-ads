-- Add phone number to DivarPost
ALTER TABLE "DivarPost"
ADD COLUMN "phoneNumber" TEXT;

-- Admin Divar sessions to store JWTs per phone
CREATE TABLE "AdminDivarSession" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "jwt" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "AdminDivarSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminDivarSession_phone_key" ON "AdminDivarSession" ("phone");
