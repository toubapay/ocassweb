-- AlterTable
ALTER TABLE "DeliveryRequest" ADD COLUMN     "assignedAgentId" TEXT;

-- AlterTable
ALTER TABLE "RideRequest" ADD COLUMN     "assignedRiderId" TEXT;

-- CreateIndex
CREATE INDEX "DeliveryRequest_assignedAgentId_idx" ON "DeliveryRequest"("assignedAgentId");

-- CreateIndex
CREATE INDEX "RideRequest_assignedRiderId_idx" ON "RideRequest"("assignedRiderId");

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'EARNING';
