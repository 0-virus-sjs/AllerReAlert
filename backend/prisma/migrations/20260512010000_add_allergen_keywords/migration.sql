-- CreateTable: 알레르기 키워드 사전 (자동 태깅 보강용)
CREATE TABLE "allergen_keywords" (
    "id"           TEXT         NOT NULL,
    "allergen_id"  TEXT         NOT NULL,
    "keyword"      TEXT         NOT NULL,
    "source"       TEXT         NOT NULL,
    "sample_count" INTEGER      NOT NULL DEFAULT 1,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "allergen_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allergen_keywords_allergen_id_keyword_key"
    ON "allergen_keywords"("allergen_id", "keyword");
CREATE INDEX "allergen_keywords_source_idx"
    ON "allergen_keywords"("source");

-- AddForeignKey
ALTER TABLE "allergen_keywords"
    ADD CONSTRAINT "allergen_keywords_allergen_id_fkey"
    FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
