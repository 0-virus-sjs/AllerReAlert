-- CreateEnum
CREATE TYPE "AlternatePlanStatus" AS ENUM ('draft', 'confirmed');

-- CreateTable
CREATE TABLE "alternate_meal_plans" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "target_allergen_id" TEXT NOT NULL,
    "status" "AlternatePlanStatus" NOT NULL DEFAULT 'draft',
    "confirmed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alternate_meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternate_meal_items" (
    "id" TEXT NOT NULL,
    "alt_plan_id" TEXT NOT NULL,
    "replaces_item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calories" INTEGER,
    "nutrients" JSONB,

    CONSTRAINT "alternate_meal_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "alternate_meal_plans" ADD CONSTRAINT "alternate_meal_plans_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternate_meal_plans" ADD CONSTRAINT "alternate_meal_plans_target_allergen_id_fkey" FOREIGN KEY ("target_allergen_id") REFERENCES "allergens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternate_meal_plans" ADD CONSTRAINT "alternate_meal_plans_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternate_meal_items" ADD CONSTRAINT "alternate_meal_items_alt_plan_id_fkey" FOREIGN KEY ("alt_plan_id") REFERENCES "alternate_meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternate_meal_items" ADD CONSTRAINT "alternate_meal_items_replaces_item_id_fkey" FOREIGN KEY ("replaces_item_id") REFERENCES "meal_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
