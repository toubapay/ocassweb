-- CreateEnum
CREATE TYPE "DeliveryPackageType" AS ENUM ('PACKAGE', 'ELECTRONICS', 'FOOD', 'DOCUMENT');

-- AlterTable
ALTER TABLE "DeliveryRequest" ADD COLUMN "packageType" "DeliveryPackageType" NOT NULL DEFAULT 'PACKAGE';
