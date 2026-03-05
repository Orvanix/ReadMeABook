/**
 * Component: Audiobook Covers API Route
 * Documentation: documentation/frontend/pages/login.md
 *
 * Serves random popular audiobook covers for login page floating animations.
 * Queries AudibleCacheCategory with '__popular__' categoryId for cover sources.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RMABLogger } from '@/lib/utils/logger';
import { POPULAR_CATEGORY_ID } from '@/lib/processors/audible-refresh.processor';

const logger = RMABLogger.create('API.Audiobooks.Covers');

/**
 * GET /api/audiobooks/covers?count=100
 * Get random popular audiobook covers for login page
 *
 * Returns lightweight cover data without matching overhead.
 * Returns up to 200 covers for immersive login screen experience.
 */
export async function GET() {
  try {
    // Get popular ASINs from category table (up to 200)
    const categoryEntries = await prisma.audibleCacheCategory.findMany({
      where: { categoryId: POPULAR_CATEGORY_ID },
      orderBy: { rank: 'asc' },
      take: 200,
      select: { asin: true },
    });

    const asins = categoryEntries.map((e) => e.asin);

    // Fetch cover data from AudibleCache for popular ASINs with cached covers
    const audiobooks = await prisma.audibleCache.findMany({
      where: {
        asin: { in: asins },
        cachedCoverPath: { not: null },
      },
      select: {
        asin: true,
        title: true,
        author: true,
        cachedCoverPath: true,
        coverArtUrl: true,
      },
    });

    // Transform to cover URLs
    const covers = audiobooks.map((book) => {
      // Prefer cached cover, fallback to original URL
      let coverUrl = book.coverArtUrl || '';
      if (book.cachedCoverPath) {
        const filename = book.cachedCoverPath.split('/').pop();
        coverUrl = `/api/cache/thumbnails/${filename}`;
      }

      return {
        asin: book.asin,
        title: book.title,
        author: book.author,
        coverUrl,
      };
    });

    // Shuffle for random distribution
    const shuffled = covers.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      success: true,
      covers: shuffled,
      count: shuffled.length,
    });
  } catch (error) {
    logger.error('Failed to get audiobook covers', { error: error instanceof Error ? error.message : String(error) });

    // Return empty array on error (login page will show placeholders)
    return NextResponse.json({
      success: false,
      covers: [],
      count: 0,
    });
  }
}
