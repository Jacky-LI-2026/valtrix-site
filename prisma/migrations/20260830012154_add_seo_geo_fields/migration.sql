-- AlterTable
ALTER TABLE "news" ADD COLUMN     "geoCity" VARCHAR(100),
ADD COLUMN     "geoRegion" VARCHAR(100),
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoKeywords" TEXT,
ADD COLUMN     "seoTitle" VARCHAR(200);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "geoCity" VARCHAR(100),
ADD COLUMN     "geoRegion" VARCHAR(100),
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoKeywords" TEXT,
ADD COLUMN     "seoTitle" VARCHAR(200);
