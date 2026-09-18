-- CreateTable
CREATE TABLE "industries" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(150),
    "tagline" VARCHAR(200),
    "taglineEn" VARCHAR(300),
    "description" TEXT,
    "descriptionEn" TEXT,
    "challenges" JSONB,
    "challengesEn" JSONB,
    "solutions" JSONB,
    "products" JSONB,
    "productsEn" JSONB,
    "cases" JSONB,
    "icon" VARCHAR(50),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");
