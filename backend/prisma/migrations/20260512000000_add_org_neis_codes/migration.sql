-- AlterTable: NEIS 급식 API 연동용 코드 (school 단체 한정, nullable)
ALTER TABLE "organizations" ADD COLUMN "atpt_code"   TEXT;
ALTER TABLE "organizations" ADD COLUMN "school_code" TEXT;
