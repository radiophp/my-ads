-- Add admin review fields to PaymentRequest
ALTER TABLE "PaymentRequest"
ADD COLUMN "featureExtras" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "adminAdjustedPrice" DECIMAL(12,2),
ADD COLUMN "adminNote" TEXT,
ADD COLUMN "adminReviewedAt" TIMESTAMP(3),
ADD COLUMN "adminReviewedBy" TEXT;

-- Add feature extras tracking to UserSubscription
ALTER TABLE "UserSubscription"
ADD COLUMN "featureExtras" JSONB NOT NULL DEFAULT '{}';
