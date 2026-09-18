-- CreateTable
CREATE TABLE "resource_categories" (
    "id" BIGSERIAL NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "titleEn" VARCHAR(150),
    "description" TEXT,
    "descriptionEn" TEXT,
    "icon" VARCHAR(50),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_items" (
    "id" BIGSERIAL NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "titleEn" VARCHAR(300),
    "description" TEXT,
    "descriptionEn" TEXT,
    "format" VARCHAR(20) NOT NULL,
    "size" VARCHAR(20),
    "fileUrl" VARCHAR(500),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_categories_type_key" ON "resource_categories"("type");

-- CreateIndex
CREATE UNIQUE INDEX "resource_items_slug_key" ON "resource_items"("slug");

-- CreateIndex
CREATE INDEX "resource_items_categoryId_idx" ON "resource_items"("categoryId");

-- CreateIndex
CREATE INDEX "resource_items_status_idx" ON "resource_items"("status");

-- AddForeignKey
ALTER TABLE "resource_items" ADD CONSTRAINT "resource_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "resource_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
