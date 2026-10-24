-- CreateTable
CREATE TABLE "PageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'other',
    "thumbnail" TEXT,
    "schema" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageTemplate_pkey" PRIMARY KEY ("id")
);
