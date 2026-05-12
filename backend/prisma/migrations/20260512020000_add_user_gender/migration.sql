-- CreateEnum: 성별 enum (학생 시 필수, 외 role은 null)
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- AlterTable: User에 gender 컬럼 추가 (nullable)
ALTER TABLE "users" ADD COLUMN "gender" "Gender";
