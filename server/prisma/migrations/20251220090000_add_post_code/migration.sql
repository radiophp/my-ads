-- Add sequence for post codes starting at 1000
CREATE SEQUENCE IF NOT EXISTS "DivarPost_code_seq"
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    NO MAXVALUE
    CACHE 1;

-- Add column with default from sequence
ALTER TABLE "DivarPost"
    ADD COLUMN "code" INTEGER;

ALTER TABLE "DivarPost"
    ALTER COLUMN "code" SET DEFAULT nextval('"DivarPost_code_seq"');

-- Backfill existing rows
UPDATE "DivarPost"
SET "code" = nextval('"DivarPost_code_seq"')
WHERE "code" IS NULL;

-- Ensure sequence is ahead of current max
SELECT setval('"DivarPost_code_seq"', GREATEST((SELECT MAX("code") FROM "DivarPost"), 999), true);

-- Enforce constraints
ALTER TABLE "DivarPost"
    ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "DivarPost_code_key" ON "DivarPost"("code");
