-- AlterTable
ALTER TABLE "PackageFeaturePriceSnapshot" ADD COLUMN     "isPermanent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oneTimeTotal" TEXT NOT NULL DEFAULT '0';
