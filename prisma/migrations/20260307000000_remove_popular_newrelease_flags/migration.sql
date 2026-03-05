-- DropIndex
DROP INDEX IF EXISTS "audible_cache_is_popular_idx";

-- DropIndex
DROP INDEX IF EXISTS "audible_cache_is_new_release_idx";

-- DropIndex
DROP INDEX IF EXISTS "audible_cache_popular_rank_idx";

-- DropIndex
DROP INDEX IF EXISTS "audible_cache_new_release_rank_idx";

-- AlterTable - Remove legacy discovery flag columns (now stored in audible_cache_categories)
ALTER TABLE "audible_cache" DROP COLUMN "is_popular",
DROP COLUMN "is_new_release",
DROP COLUMN "popular_rank",
DROP COLUMN "new_release_rank";
