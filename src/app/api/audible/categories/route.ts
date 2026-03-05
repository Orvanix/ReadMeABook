/**
 * Component: Audible Categories API Route
 * Documentation: documentation/features/home-sections.md
 *
 * Live scrape of top-level Audible categories for the home section config modal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { RMABLogger } from '@/lib/utils/logger';

const logger = RMABLogger.create('API.Audible.Categories');

/**
 * GET /api/audible/categories
 * Returns top-level Audible categories scraped live from audible.com/categories
 */
export async function GET(request: NextRequest) {
  return requireAuth(request, async (_req: AuthenticatedRequest) => {
    try {
      const { getAudibleService } = await import('@/lib/integrations/audible.service');
      const audibleService = getAudibleService();
      const categories = await audibleService.getCategories();

      return NextResponse.json({
        success: true,
        categories,
      });
    } catch (error) {
      logger.error('Failed to fetch categories', {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: 'FetchError', message: 'Failed to fetch Audible categories' },
        { status: 500 }
      );
    }
  });
}
