-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_deliveryRequestId_key" ON "Order"("deliveryRequestId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryRequestId_fkey" FOREIGN KEY ("deliveryRequestId") REFERENCES "DeliveryRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
