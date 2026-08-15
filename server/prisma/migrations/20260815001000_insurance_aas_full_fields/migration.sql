-- AlterTable
ALTER TABLE "InsuranceAutoPolicy" ADD COLUMN     "assure" JSONB NOT NULL,
ADD COLUMN     "cylindre" INTEGER,
ADD COLUMN     "dateMiseCirculation" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "marque" TEXT NOT NULL,
ADD COLUMN     "modele" TEXT NOT NULL,
ADD COLUMN     "nombrePlace" INTEGER NOT NULL,
ADD COLUMN     "puissanceFiscale" TEXT,
ADD COLUMN     "souscripteur" JSONB NOT NULL,
ADD COLUMN     "typePersonne" TEXT NOT NULL,
ADD COLUMN     "usage" TEXT,
ADD COLUMN     "valeurActuelle" DECIMAL(12,2),
ADD COLUMN     "valeurNeuve" DECIMAL(12,2);

