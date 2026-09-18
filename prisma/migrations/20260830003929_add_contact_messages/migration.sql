-- CreateTable
CREATE TABLE "contact_messages" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "company" VARCHAR(200),
    "phone" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "subject" VARCHAR(200),
    "message" TEXT NOT NULL,
    "source" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "assignedTo" BIGINT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);
