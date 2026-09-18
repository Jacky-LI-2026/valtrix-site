-- CreateTable
CREATE TABLE "home_config" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT '默认首页配置',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "banners" JSONB,
    "features" JSONB,
    "stats" JSONB,
    "featuredProducts" JSONB,
    "showNews" BOOLEAN NOT NULL DEFAULT true,
    "showIndustries" BOOLEAN NOT NULL DEFAULT true,
    "showServices" BOOLEAN NOT NULL DEFAULT true,
    "ctaTitle" VARCHAR(200),
    "ctaSubtitle" VARCHAR(500),
    "ctaButtonText" VARCHAR(50),
    "ctaButtonLink" VARCHAR(200),
    "seoTitle" VARCHAR(200),
    "seoDesc" TEXT,
    "seoKeywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_config_pkey" PRIMARY KEY ("id")
);
