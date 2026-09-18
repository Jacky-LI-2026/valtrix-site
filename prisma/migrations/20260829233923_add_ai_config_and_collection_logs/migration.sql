-- CreateTable
CREATE TABLE "ai_config" (
    "id" BIGSERIAL NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'openai',
    "apiKey" VARCHAR(500),
    "baseUrl" VARCHAR(500),
    "model" VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "remark" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_logs" (
    "id" BIGSERIAL NOT NULL,
    "sourceId" BIGINT NOT NULL,
    "sourceName" VARCHAR(200) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "collected" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_logs_sourceId_idx" ON "collection_logs"("sourceId");

-- CreateIndex
CREATE INDEX "collection_logs_status_idx" ON "collection_logs"("status");
