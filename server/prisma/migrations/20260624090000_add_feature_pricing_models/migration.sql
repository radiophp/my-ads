-- Create FeaturePricingType enum
CREATE TYPE "FeaturePricingType" AS ENUM ('PER_UNIT', 'FLAT_ACCESS');

-- Create FeatureBasePrice table
CREATE TABLE "FeatureBasePrice" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "pricingType" "FeaturePricingType" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureBasePrice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FeatureBasePrice_featureKey_key" UNIQUE ("featureKey")
);

-- Create PackageFeatureConfig table
CREATE TABLE "PackageFeatureConfig" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "limitValue" INTEGER NOT NULL DEFAULT 0,
    "allowExtra" BOOLEAN NOT NULL DEFAULT false,
    "maxExtra" INTEGER NOT NULL DEFAULT 0,
    "unitPriceOverride" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageFeatureConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PackageFeatureConfig_packageId_featureKey_key" UNIQUE ("packageId", "featureKey")
);

CREATE INDEX "PackageFeatureConfig_packageId_idx" ON "PackageFeatureConfig"("packageId");

ALTER TABLE "PackageFeatureConfig" ADD CONSTRAINT "PackageFeatureConfig_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PackageFeaturePriceSnapshot table
CREATE TABLE "PackageFeaturePriceSnapshot" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "pricingType" "FeaturePricingType" NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "limitValue" INTEGER NOT NULL DEFAULT 0,
    "dailyTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageFeaturePriceSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PackageFeaturePriceSnapshot_packageId_featureKey_key" UNIQUE ("packageId", "featureKey")
);

CREATE INDEX "PackageFeaturePriceSnapshot_packageId_idx" ON "PackageFeaturePriceSnapshot"("packageId");

ALTER TABLE "PackageFeaturePriceSnapshot" ADD CONSTRAINT "PackageFeaturePriceSnapshot_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SubscriptionPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing features JSON data to PackageFeatureConfig
INSERT INTO "PackageFeatureConfig" ("id", "packageId", "featureKey", "limitValue", "allowExtra", "maxExtra", "unitPriceOverride", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    sp."id",
    kv.key,
    CASE
        WHEN kv.value::text ~ '^[0-9]+$' THEN kv.value::integer
        WHEN kv.value::text = 'true' THEN 1
        ELSE 0
    END,
    false,
    0,
    NULL,
    NOW(),
    NOW()
FROM "SubscriptionPackage" sp
CROSS JOIN LATERAL jsonb_each_text(sp."features"::jsonb) AS kv(key, value);
