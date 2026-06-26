-- Add districtAssignments JSON field to PaymentRequest and UserSubscription
ALTER TABLE "PaymentRequest"
ADD COLUMN "districtAssignments" JSON NOT NULL DEFAULT '{}';

ALTER TABLE "UserSubscription"
ADD COLUMN "districtAssignments" JSON NOT NULL DEFAULT '{}';
