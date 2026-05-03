-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('need_check', 'menu_vote');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('open', 'closed');

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "type" "SurveyType" NOT NULL,
    "options" JSONB NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "SurveyStatus" NOT NULL DEFAULT 'open',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "voted_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_responses_survey_id_user_id_key" ON "survey_responses"("survey_id", "user_id");

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
