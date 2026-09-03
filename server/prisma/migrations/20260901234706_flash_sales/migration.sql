-- CreateEnum
CREATE TYPE "FlashSaleRecurrence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FlashSaleSelectionMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "selectionMode" "FlashSaleSelectionMode" NOT NULL DEFAULT 'AUTO',
    "recurrenceType" "FlashSaleRecurrence" NOT NULL DEFAULT 'DAILY',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "onHomeScreen" BOOLEAN NOT NULL DEFAULT false,
    "onEcommerceHome" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FlashSaleProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_FlashSaleProducts_AB_unique" ON "_FlashSaleProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_FlashSaleProducts_B_index" ON "_FlashSaleProducts"("B");

-- AddForeignKey
ALTER TABLE "_FlashSaleProducts" ADD CONSTRAINT "_FlashSaleProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FlashSaleProducts" ADD CONSTRAINT "_FlashSaleProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
