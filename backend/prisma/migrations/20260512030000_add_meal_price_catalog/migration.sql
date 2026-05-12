-- CreateTable: 학교별 메뉴 참고 단가 카탈로그 (T-128)
CREATE TABLE "meal_price_catalog" (
    "id"            TEXT             NOT NULL,
    "org_id"        TEXT             NOT NULL,
    "keyword"       TEXT             NOT NULL,
    "category"      "MealItemCategory" NOT NULL,
    "avg_price"     INTEGER          NOT NULL,
    "sample_count"  INTEGER          NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "meal_price_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_price_catalog_org_id_keyword_key"
    ON "meal_price_catalog"("org_id", "keyword");
CREATE INDEX "meal_price_catalog_org_id_category_idx"
    ON "meal_price_catalog"("org_id", "category");

-- AddForeignKey
ALTER TABLE "meal_price_catalog"
    ADD CONSTRAINT "meal_price_catalog_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
