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

-- Ensure sequence is ahead of current max (fallback to 1000 to respect MINVALUE)
SELECT setval(
    '"DivarPost_code_seq"',
    GREATEST(COALESCE((SELECT MAX("code") FROM "DivarPost"), 1000), 1000),
    true
);

-- Enforce constraints
ALTER TABLE "DivarPost"
    ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "DivarPost_code_key" ON "DivarPost"("code");
