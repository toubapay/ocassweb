-- AlterTable
ALTER TABLE "MobileTransaction" ADD COLUMN     "forfaitId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "MobileForfait" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "callMinutesLabel" TEXT,
    "internetLabel" TEXT,
    "validityLabel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileForfait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileForfait_serviceId_isActive_idx" ON "MobileForfait"("serviceId", "isActive");

-- AddForeignKey
ALTER TABLE "MobileForfait" ADD CONSTRAINT "MobileForfait_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MobileService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTransaction" ADD CONSTRAINT "MobileTransaction_forfaitId_fkey" FOREIGN KEY ("forfaitId") REFERENCES "MobileForfait"("id") ON DELETE SET NULL ON UPDATE CASCADE;

