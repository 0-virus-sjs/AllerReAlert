-- CreateTable
CREATE TABLE "meal_generation_jobs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "total_days" INTEGER,
    "completed_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_generation_jobs_org_id_created_at_idx" ON "meal_generation_jobs"("org_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "meal_generation_jobs_status_created_at_idx" ON "meal_generation_jobs"("status", "created_at" DESC);
