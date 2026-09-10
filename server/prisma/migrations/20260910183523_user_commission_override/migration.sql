-- AlterTable: User gains an optional admin-set commission share override
ALTER TABLE "User" ADD COLUMN "commissionSharePercent" DECIMAL(5,2);
