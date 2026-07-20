-- CreateEnum
CREATE TYPE "RidePostingStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'DEPARTED');

-- CreateEnum
CREATE TYPE "RideBookingPaymentMethod" AS ENUM ('CASH', 'WALLET', 'PAYDUNYA');

-- CreateEnum
CREATE TYPE "RideBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'ANANDO_BOOKING';

-- CreateTable
CREATE TABLE "RidePosting" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "originAddress" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "destinationAddress" TEXT NOT NULL,
    "destinationLat" DOUBLE PRECISION,
    "destinationLng" DOUBLE PRECISION,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "isInstant" BOOLEAN NOT NULL DEFAULT false,
    "seatsTotal" INTEGER NOT NULL,
    "seatsAvailable" INTEGER NOT NULL,
    "pricePerSeat" DECIMAL(10,2),
    "note" TEXT,
    "status" "RidePostingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RidePosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideBooking" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "seatsBooked" INTEGER NOT NULL DEFAULT 1,
    "paymentMethod" "RideBookingPaymentMethod" NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "status" "RideBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RidePosting_status_departureAt_idx" ON "RidePosting"("status", "departureAt");

-- CreateIndex
CREATE INDEX "RideBooking_postingId_idx" ON "RideBooking"("postingId");

-- CreateIndex
CREATE INDEX "RideBooking_passengerId_idx" ON "RideBooking"("passengerId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AddForeignKey
ALTER TABLE "RidePosting" ADD CONSTRAINT "RidePosting_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideBooking" ADD CONSTRAINT "RideBooking_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "RidePosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideBooking" ADD CONSTRAINT "RideBooking_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

