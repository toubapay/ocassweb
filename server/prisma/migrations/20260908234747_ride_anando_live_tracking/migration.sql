-- AlterTable
ALTER TABLE "RidePosting" ADD COLUMN     "driverLat" DOUBLE PRECISION,
ADD COLUMN     "driverLng" DOUBLE PRECISION,
ADD COLUMN     "driverLocationAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RideRequest" ADD COLUMN     "riderLat" DOUBLE PRECISION,
ADD COLUMN     "riderLng" DOUBLE PRECISION,
ADD COLUMN     "riderLocationAt" TIMESTAMP(3);
