-- CreateTable
CREATE TABLE "seo_config" (
    "id" BIGSERIAL NOT NULL,
    "siteName" VARCHAR(100) NOT NULL DEFAULT '左文科技',
    "siteNameEn" VARCHAR(150) NOT NULL DEFAULT 'ZUO WEN TECHNOLOGY',
    "defaultTitle" VARCHAR(200),
    "defaultDesc" TEXT,
    "keywords" TEXT,
    "companyName" VARCHAR(200),
    "companyAddress" VARCHAR(500),
    "phone" VARCHAR(50),
    "email" VARCHAR(100),
    "latitude" VARCHAR(50),
    "longitude" VARCHAR(50),
    "geoRegion" VARCHAR(50),
    "socialLinks" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_config_pkey" PRIMARY KEY ("id")
);
