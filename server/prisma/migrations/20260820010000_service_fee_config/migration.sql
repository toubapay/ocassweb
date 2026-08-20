-- CreateEnum
CREATE TYPE "FeeValueType" AS ENUM ('PERCENT', 'FLAT');

-- CreateTable
CREATE TABLE "ServiceFeeConfig" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "feeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "feeType" "FeeValueType" NOT NULL DEFAULT 'PERCENT',
    "feeValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
    "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceFeeConfig_moduleKey_idx" ON "ServiceFeeConfig"("moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceFeeConfig_moduleKey_serviceType_serviceId_key" ON "ServiceFeeConfig"("moduleKey", "serviceType", "serviceId");

-- AlterTable: Order - subtotal added nullable, backfilled from the
-- existing `total` (which, before this migration, only ever meant "sum of
-- line items"), then locked NOT NULL. feeAmount/taxAmount default to 0
-- directly since existing orders truthfully have no fee/tax charged.
ALTER TABLE "Order" ADD COLUMN "subtotal" DECIMAL(10,2);
UPDATE "Order" SET "subtotal" = "total";
ALTER TABLE "Order" ALTER COLUMN "subtotal" SET NOT NULL;
ALTER TABLE "Order" ADD COLUMN "feeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable: RestaurantOrder - same backfill as Order above.
ALTER TABLE "RestaurantOrder" ADD COLUMN "subtotal" DECIMAL(10,2);
UPDATE "RestaurantOrder" SET "subtotal" = "total";
ALTER TABLE "RestaurantOrder" ALTER COLUMN "subtotal" SET NOT NULL;
ALTER TABLE "RestaurantOrder" ADD COLUMN "feeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "RestaurantOrder" ADD COLUMN "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable: MobileTransaction - `amount` keeps its existing meaning (no
-- backfill needed), fee/tax are purely additive new columns.
ALTER TABLE "MobileTransaction" ADD COLUMN "feeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "MobileTransaction" ADD COLUMN "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
