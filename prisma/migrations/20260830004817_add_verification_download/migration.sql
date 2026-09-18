-- CreateTable
CREATE TABLE "verification_codes" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'download',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_records" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT '',
    "company" VARCHAR(200) NOT NULL DEFAULT '',
    "phone" VARCHAR(50) NOT NULL DEFAULT '',
    "email" VARCHAR(100) NOT NULL,
    "resourceId" BIGINT,
    "resourceName" VARCHAR(200),
    "verifiedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_codes_email_idx" ON "verification_codes"("email");

-- CreateIndex
CREATE INDEX "download_records_email_idx" ON "download_records"("email");

-- CreateIndex
CREATE INDEX "download_records_resourceId_idx" ON "download_records"("resourceId");
