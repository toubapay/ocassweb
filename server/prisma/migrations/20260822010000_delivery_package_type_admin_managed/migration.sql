-- Convert DeliveryRequest.packageType from the fixed "DeliveryPackageType"
-- enum into a plain text column referencing the new admin-managed
-- DeliveryPackageType table by key (see schema.prisma). The enum::text
-- cast below preserves each existing row's value verbatim (e.g. 'PACKAGE'),
-- which is exactly the key the seed rows below reuse, so no backfill is
-- needed for rows created before this migration.

-- AlterTable
ALTER TABLE "DeliveryRequest" ALTER COLUMN "packageType" DROP DEFAULT;
ALTER TABLE "DeliveryRequest" ALTER COLUMN "packageType" TYPE TEXT USING "packageType"::text;
ALTER TABLE "DeliveryRequest" ALTER COLUMN "packageType" SET DEFAULT 'PACKAGE';

-- DropEnum
DROP TYPE "DeliveryPackageType";

-- CreateTable
CREATE TABLE "DeliveryPackageType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "hintEn" TEXT,
    "hintFr" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Inventory2Rounded',
    "colorKey" TEXT NOT NULL DEFAULT 'slate',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPackageType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPackageType_key_key" ON "DeliveryPackageType"("key");

-- Seed the 4 types that existed as enum values, so every request created
-- before this migration keeps resolving to a real, editable catalog row
-- instead of an unknown key.
INSERT INTO "DeliveryPackageType"
  ("id", "key", "labelEn", "labelFr", "hintEn", "hintFr", "icon", "colorKey", "sortOrder", "isActive", "updatedAt")
VALUES
  ('4d46fbcd-efc1-44dd-8962-14cd82f8f8e4', 'PACKAGE', 'Package', 'Colis',
    'No passport or bank cheques allowed', 'Passeport et chèques bancaires interdits',
    'Inventory2Rounded', 'slate', 0, true, CURRENT_TIMESTAMP),
  ('5cc7d19a-6949-410a-92db-7c2279331be8', 'ELECTRONICS', 'Electronics', 'Électronique',
    'Bubble wrapped, note if fragile', 'Emballage à bulles, précisez si fragile',
    'DevicesOtherRounded', 'blue', 1, true, CURRENT_TIMESTAMP),
  ('2956165c-f7e7-4817-98c8-93a5169f6b31', 'FOOD', 'Food & Groceries', 'Alimentation',
    'Perishable, note if it needs to stay cold', 'Périssable, précisez si à garder au frais',
    'LocalGroceryStoreRounded', 'amber', 2, true, CURRENT_TIMESTAMP),
  ('e1040b33-b263-44db-854e-83ecc2df259c', 'DOCUMENT', 'Documents', 'Documents',
    'Envelopes, papers, ID copies', 'Enveloppes, papiers, copies de pièces d''identité',
    'DescriptionRounded', 'green', 3, true, CURRENT_TIMESTAMP);
