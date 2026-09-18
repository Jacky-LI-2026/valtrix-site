-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "passwordHash" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(50) NOT NULL,
    "avatar" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "module" VARCHAR(30) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" BIGINT NOT NULL,
    "permissionId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "product_tabs" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" BIGSERIAL NOT NULL,
    "tabId" BIGINT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nameEn" VARCHAR(100),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" BIGSERIAL NOT NULL,
    "tabId" BIGINT NOT NULL,
    "categoryId" BIGINT,
    "slug" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "nameEn" VARCHAR(200),
    "subtitle" VARCHAR(300),
    "summary" TEXT,
    "description" TEXT,
    "features" JSONB,
    "images" JSONB,
    "coverImage" VARCHAR(500),
    "frames360" JSONB,
    "manualUrl" VARCHAR(500),
    "specs" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_specs" (
    "id" BIGSERIAL NOT NULL,
    "productId" BIGINT NOT NULL,
    "groupName" VARCHAR(100),
    "label" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "unit" VARCHAR(20),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_config" (
    "id" BIGSERIAL NOT NULL,
    "configKey" VARCHAR(100) NOT NULL,
    "configValue" JSONB,
    "remark" VARCHAR(200),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_config" (
    "id" BIGSERIAL NOT NULL,
    "primary" VARCHAR(7) NOT NULL DEFAULT '#CC0000',
    "primaryLight" VARCHAR(7),
    "primaryDark" VARCHAR(7),
    "accent" VARCHAR(7) NOT NULL DEFAULT '#C0C0C0',
    "dark" VARCHAR(7) NOT NULL DEFAULT '#111111',
    "darkLight" VARCHAR(7),
    "fontFamily" VARCHAR(100),
    "remark" VARCHAR(200),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "username" VARCHAR(50),
    "module" VARCHAR(30) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "target" VARCHAR(200),
    "detail" JSONB,
    "ip" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_versions" (
    "id" BIGSERIAL NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "releaseDate" DATE NOT NULL,
    "buildTime" TIMESTAMP(3),
    "gitCommit" VARCHAR(40),
    "environment" VARCHAR(20) NOT NULL DEFAULT 'production',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_update_logs" (
    "id" BIGSERIAL NOT NULL,
    "versionId" BIGINT,
    "version" VARCHAR(20) NOT NULL,
    "changeType" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(30),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_update_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_tabs_slug_key" ON "product_tabs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tabId_slug_key" ON "product_categories"("tabId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_tabId_idx" ON "products"("tabId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "product_specs_productId_idx" ON "product_specs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "site_config_configKey_key" ON "site_config"("configKey");

-- CreateIndex
CREATE INDEX "operation_logs_userId_idx" ON "operation_logs"("userId");

-- CreateIndex
CREATE INDEX "operation_logs_module_idx" ON "operation_logs"("module");

-- CreateIndex
CREATE INDEX "operation_logs_createdAt_idx" ON "operation_logs"("createdAt");

-- CreateIndex
CREATE INDEX "system_versions_isCurrent_idx" ON "system_versions"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "system_versions_version_environment_key" ON "system_versions"("version", "environment");

-- CreateIndex
CREATE INDEX "system_update_logs_version_idx" ON "system_update_logs"("version");

-- CreateIndex
CREATE INDEX "system_update_logs_changeType_idx" ON "system_update_logs"("changeType");

-- CreateIndex
CREATE INDEX "system_update_logs_versionId_idx" ON "system_update_logs"("versionId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "product_tabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "product_tabs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_update_logs" ADD CONSTRAINT "system_update_logs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "system_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
