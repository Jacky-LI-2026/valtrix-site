-- CreateTable
CREATE TABLE "about_sections" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "titleEn" VARCHAR(150),
    "subtitle" VARCHAR(200),
    "subtitleEn" VARCHAR(300),
    "content" JSONB,
    "highlights" JSONB,
    "timeline" JSONB,
    "certifications" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" BIGSERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "titleEn" VARCHAR(150),
    "department" VARCHAR(50) NOT NULL,
    "departmentEn" VARCHAR(100),
    "location" VARCHAR(50) NOT NULL,
    "locationEn" VARCHAR(100),
    "type" VARCHAR(20) NOT NULL,
    "typeEn" VARCHAR(50),
    "salary" VARCHAR(50),
    "salaryEn" VARCHAR(50),
    "experience" VARCHAR(50),
    "experienceEn" VARCHAR(100),
    "education" VARCHAR(50),
    "educationEn" VARCHAR(100),
    "tags" JSONB,
    "tagsEn" JSONB,
    "description" TEXT,
    "descriptionEn" TEXT,
    "responsibilities" JSONB,
    "responsibilitiesEn" JSONB,
    "requirements" JSONB,
    "requirementsEn" JSONB,
    "benefits" JSONB,
    "benefitsEn" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "about_sections_slug_key" ON "about_sections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- CreateIndex
CREATE INDEX "jobs_department_idx" ON "jobs"("department");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");
