-- CreateTable
CREATE TABLE "analytics_visitors" (
    "id" BIGSERIAL NOT NULL,
    "visitorKey" VARCHAR(64) NOT NULL,
    "ip" VARCHAR(45),
    "userAgent" TEXT,
    "deviceType" VARCHAR(20),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "language" VARCHAR(20),
    "country" VARCHAR(50),
    "region" VARCHAR(50),
    "city" VARCHAR(50),
    "referrer" TEXT,
    "landingPage" VARCHAR(255),
    "firstVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 1,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_page_views" (
    "id" BIGSERIAL NOT NULL,
    "visitorId" BIGINT NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "referrer" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "visitorId" BIGINT NOT NULL,
    "pageViewId" BIGINT,
    "type" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50),
    "action" VARCHAR(100),
    "label" VARCHAR(200),
    "value" VARCHAR(500),
    "url" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analytics_visitors_visitorKey_key" ON "analytics_visitors"("visitorKey");

-- CreateIndex
CREATE INDEX "analytics_visitors_ip_idx" ON "analytics_visitors"("ip");

-- CreateIndex
CREATE INDEX "analytics_visitors_createdAt_idx" ON "analytics_visitors"("createdAt");

-- CreateIndex
CREATE INDEX "analytics_visitors_lastSeenAt_idx" ON "analytics_visitors"("lastSeenAt");

-- CreateIndex
CREATE INDEX "analytics_page_views_visitorId_idx" ON "analytics_page_views"("visitorId");

-- CreateIndex
CREATE INDEX "analytics_page_views_path_idx" ON "analytics_page_views"("path");

-- CreateIndex
CREATE INDEX "analytics_page_views_enteredAt_idx" ON "analytics_page_views"("enteredAt");

-- CreateIndex
CREATE INDEX "analytics_events_visitorId_idx" ON "analytics_events"("visitorId");

-- CreateIndex
CREATE INDEX "analytics_events_type_idx" ON "analytics_events"("type");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- AddForeignKey
ALTER TABLE "analytics_page_views" ADD CONSTRAINT "analytics_page_views_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "analytics_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "analytics_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
