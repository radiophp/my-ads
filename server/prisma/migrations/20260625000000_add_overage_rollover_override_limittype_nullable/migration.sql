-- Add extraUnitPrice, allowRollover, maxRolloverCap to PackageFeatureConfig
ALTER TABLE "PackageFeatureConfig"
  ADD COLUMN "extraUnitPrice" DECIMAL(12,2),
  ADD COLUMN "allowRollover" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxRolloverCap" INTEGER NOT NULL DEFAULT 0;

-- Add extraUnitPrice, allowRollover, maxRolloverCap to PackageFeaturePriceSnapshot
ALTER TABLE "PackageFeaturePriceSnapshot"
  ADD COLUMN "extraUnitPrice" DECIMAL(12,2),
  ADD COLUMN "allowRollover" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxRolloverCap" INTEGER NOT NULL DEFAULT 0;

-- Make FeatureBasePrice.limitType nullable
ALTER TABLE "FeatureBasePrice"
  ALTER COLUMN "limitType" DROP DEFAULT,
  ALTER COLUMN "limitType" DROP NOT NULL;

-- Create UserFeatureOverride table
CREATE TABLE "UserFeatureOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "limitValue" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserFeatureOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserFeatureOverride_userId_featureKey_key" UNIQUE ("userId", "featureKey")
);

CREATE INDEX "UserFeatureOverride_userId_idx" ON "UserFeatureOverride"("userId");

ALTER TABLE "UserFeatureOverride"
  ADD CONSTRAINT "UserFeatureOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create UsageRollover table
CREATE TABLE "UsageRollover" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "rolloverBalance" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UsageRollover_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UsageRollover_userId_subscriptionId_featureKey_key" UNIQUE ("userId", "subscriptionId", "featureKey")
);

CREATE INDEX "UsageRollover_userId_subscriptionId_idx" ON "UsageRollover"("userId", "subscriptionId");

ALTER TABLE "UsageRollover"
  ADD CONSTRAINT "UsageRollover_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UsageRollover"
  ADD CONSTRAINT "UsageRollover_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
