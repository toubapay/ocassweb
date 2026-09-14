-- CreateTable: single admin-editable Home Screen promo banner
CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeBanner_key_key" ON "HomeBanner"("key");

-- Seed the single row with the copy this section already showed
-- (hardcoded until now), so behavior is unchanged until an admin edits it.
INSERT INTO "HomeBanner" ("id", "key", "title", "subtitle", "isActive", "updatedAt")
VALUES (
    '9b1f6b6a-2f9b-4b0a-8b8a-6f5c7b1a0001',
    'main',
    'Livraison gratuite pour votre première commande',
    'Offre appliquée automatiquement lors du paiement.',
    true,
    now()
);
