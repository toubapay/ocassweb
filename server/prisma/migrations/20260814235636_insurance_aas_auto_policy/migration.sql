-- CreateEnum
CREATE TYPE "InsuranceAutoStatus" AS ENUM ('PENDING', 'ISSUING', 'ACTIVE', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InsuranceAutoPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL DEFAULT 'AAS',
    "tier" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "energie" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "chassis" TEXT NOT NULL,
    "garanties" INTEGER[],
    "garantiesOptPT" TEXT,
    "periodicite" TEXT NOT NULL,
    "duree" INTEGER NOT NULL,
    "premiumEstimate" DECIMAL(10,2) NOT NULL,
    "premiumCharged" DECIMAL(10,2),
    "status" "InsuranceAutoStatus" NOT NULL DEFAULT 'PENDING',
    "referenceTrxPartner" TEXT NOT NULL,
    "fulfillmentAttempts" INTEGER NOT NULL DEFAULT 0,
    "linkAttestation" TEXT,
    "fulfillmentError" TEXT,
    "fulfillmentErrorCode" TEXT,
    "requestSnapshot" JSONB,
    "responseSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceAutoPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceAutoPolicy_referenceTrxPartner_key" ON "InsuranceAutoPolicy"("referenceTrxPartner");

-- CreateIndex
CREATE INDEX "InsuranceAutoPolicy_userId_idx" ON "InsuranceAutoPolicy"("userId");

-- AddForeignKey
ALTER TABLE "InsuranceAutoPolicy" ADD CONSTRAINT "InsuranceAutoPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

