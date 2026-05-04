-- AlterTable: meal_plans에 scheduled_at 컬럼 추가 (T-032 예약 공개)
ALTER TABLE "meal_plans" ADD COLUMN "scheduled_at" TIMESTAMP(3);
