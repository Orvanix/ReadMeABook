-- CreateTable
CREATE TABLE "ignored_audiobooks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "cover_art_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ignored_audiobooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ignored_audiobooks_user_id_idx" ON "ignored_audiobooks"("user_id");

-- CreateIndex
CREATE INDEX "ignored_audiobooks_asin_idx" ON "ignored_audiobooks"("asin");

-- CreateIndex
CREATE UNIQUE INDEX "ignored_audiobooks_user_id_asin_key" ON "ignored_audiobooks"("user_id", "asin");

-- AddForeignKey
ALTER TABLE "ignored_audiobooks" ADD CONSTRAINT "ignored_audiobooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
