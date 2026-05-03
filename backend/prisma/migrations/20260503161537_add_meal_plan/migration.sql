-- CreateEnum
CREATE TYPE "MealPlanStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "MealItemCategory" AS ENUM ('rice', 'soup', 'side', 'dessert');

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "MealPlanStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_items" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "category" "MealItemCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "calories" INTEGER,
    "nutrients" JSONB,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_item_allergens" (
    "meal_item_id" TEXT NOT NULL,
    "allergen_id" TEXT NOT NULL,
    "is_auto_tagged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "meal_item_allergens_pkey" PRIMARY KEY ("meal_item_id","allergen_id")
);

-- CreateIndex
CREATE INDEX "meal_plans_org_id_date_idx" ON "meal_plans"("org_id", "date");

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_item_allergens" ADD CONSTRAINT "meal_item_allergens_meal_item_id_fkey" FOREIGN KEY ("meal_item_id") REFERENCES "meal_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_item_allergens" ADD CONSTRAINT "meal_item_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
