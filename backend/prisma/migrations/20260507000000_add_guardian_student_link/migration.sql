-- AlterTable
ALTER TABLE "users" ADD COLUMN "link_code" TEXT;

-- CreateTable
CREATE TABLE "guardian_students" (
    "id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guardian_students_guardian_id_idx" ON "guardian_students"("guardian_id");

-- CreateIndex
CREATE INDEX "guardian_students_student_id_idx" ON "guardian_students"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_students_guardian_id_student_id_key" ON "guardian_students"("guardian_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_link_code_key" ON "users"("link_code");

-- AddForeignKey
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_students" ADD CONSTRAINT "guardian_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
