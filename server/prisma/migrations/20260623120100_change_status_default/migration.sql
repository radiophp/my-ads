-- Change default for new records to INITIATED
ALTER TABLE "PaymentRequest" ALTER COLUMN "status" SET DEFAULT 'INITIATED';

-- Migrate existing PENDING records without receiptUrl to INITIATED
UPDATE "PaymentRequest" SET "status" = 'INITIATED' WHERE "status" = 'PENDING' AND "receiptUrl" IS NULL;
