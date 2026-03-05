-- CreateTable
CREATE TABLE "user_home_sections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "section_type" TEXT NOT NULL,
    "category_id" TEXT,
    "category_name" TEXT,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_home_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audible_cache_categories" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audible_cache_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_home_sections_user_id_idx" ON "user_home_sections"("user_id");

-- CreateIndex
CREATE INDEX "user_home_sections_sort_order_idx" ON "user_home_sections"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "user_home_sections_user_id_section_type_category_id_key" ON "user_home_sections"("user_id", "section_type", "category_id");

-- CreateIndex
CREATE INDEX "audible_cache_categories_category_id_idx" ON "audible_cache_categories"("category_id");

-- CreateIndex
CREATE INDEX "audible_cache_categories_asin_idx" ON "audible_cache_categories"("asin");

-- CreateIndex
CREATE INDEX "audible_cache_categories_category_id_rank_idx" ON "audible_cache_categories"("category_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "audible_cache_categories_asin_category_id_key" ON "audible_cache_categories"("asin", "category_id");

-- AddForeignKey
ALTER TABLE "user_home_sections" ADD CONSTRAINT "user_home_sections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
