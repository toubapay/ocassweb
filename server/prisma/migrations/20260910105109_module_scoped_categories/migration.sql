-- AlterTable: Category gains moduleKey, slug uniqueness becomes per-module
ALTER TABLE "Category" ADD COLUMN "moduleKey" TEXT NOT NULL DEFAULT 'ecommerce';

DROP INDEX IF EXISTS "Category_slug_key";
CREATE UNIQUE INDEX "Category_moduleKey_slug_key" ON "Category"("moduleKey", "slug");

-- AlterTable: ShowcaseSlide gains moduleKey
ALTER TABLE "ShowcaseSlide" ADD COLUMN "moduleKey" TEXT NOT NULL DEFAULT 'ecommerce';

-- AlterTable: MenuItem gains categoryId (nullable FK to Category)
ALTER TABLE "MenuItem" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
