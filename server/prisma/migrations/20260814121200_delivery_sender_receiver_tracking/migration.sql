-- AlterTable
ALTER TABLE "DeliveryRequest" ADD COLUMN     "agentLat" DOUBLE PRECISION,
ADD COLUMN     "agentLng" DOUBLE PRECISION,
ADD COLUMN     "agentLocationAt" TIMESTAMP(3),
ADD COLUMN     "receiverName" TEXT,
ADD COLUMN     "receiverPhone" TEXT,
ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "senderPhone" TEXT;

