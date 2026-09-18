-- CreateTable
CREATE TABLE "services" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "titleEn" VARCHAR(150),
    "subtitle" VARCHAR(200),
    "subtitleEn" VARCHAR(300),
    "description" TEXT,
    "descriptionEn" TEXT,
    "features" JSONB,
    "featuresEn" JSONB,
    "process" JSONB,
    "processEn" JSONB,
    "icon" VARCHAR(50),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");
