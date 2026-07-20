-- CreateEnum
CREATE TYPE "MobileServiceType" AS ENUM ('AIRTIME', 'DATA_BUNDLE', 'BILL');

-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('ELECTRICITY', 'WATER', 'TV', 'INTERNET', 'OTHER');

-- CreateEnum
CREATE TYPE "MobileTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "MobileService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "type" "MobileServiceType" NOT NULL,
    "billCategory" "BillCategory",
    "phonePrefixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minAmount" DECIMAL(10,2),
    "maxAmount" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MobileService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" "MobileServiceType" NOT NULL,
    "phoneNumber" TEXT,
    "accountNumber" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "MobileTransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileTransaction_reference_key" ON "MobileTransaction"("reference");

-- AddForeignKey
ALTER TABLE "MobileTransaction" ADD CONSTRAINT "MobileTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileTransaction" ADD CONSTRAINT "MobileTransaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "MobileService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
