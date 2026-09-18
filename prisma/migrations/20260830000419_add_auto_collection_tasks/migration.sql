-- CreateTable
CREATE TABLE "auto_collection_tasks" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "keyword" VARCHAR(500) NOT NULL,
    "categoryId" BIGINT,
    "frequency" VARCHAR(20) NOT NULL DEFAULT 'daily',
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "includeImage" BOOLEAN NOT NULL DEFAULT true,
    "defaultImage" VARCHAR(500),
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" VARCHAR(20),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_collection_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_collection_tasks_enabled_idx" ON "auto_collection_tasks"("enabled");
