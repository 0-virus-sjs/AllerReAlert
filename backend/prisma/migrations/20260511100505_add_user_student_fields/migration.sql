-- AlterTable
ALTER TABLE "users" ADD COLUMN     "class_no" TEXT,
ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "student_code" TEXT;

-- CreateIndex
CREATE INDEX "users_org_id_grade_class_no_idx" ON "users"("org_id", "grade", "class_no");
