-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consented_at" TIMESTAMP(3),
ADD COLUMN     "guardian_consent_required" BOOLEAN NOT NULL DEFAULT false;
