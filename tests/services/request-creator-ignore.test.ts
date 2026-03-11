/**
 * Component: Request Creator Ignore Tests
 * Documentation: documentation/features/ignored-audiobooks.md
 *
 * Tests the per-user ignore list check in createRequestForUser,
 * including direct ASIN match, works-system sibling expansion,
 * and the bypassIgnore option.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../helpers/prisma';

const prismaMock = createPrismaMock();

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/utils/logger', () => ({
  RMABLogger: {
    create: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock findPlexMatch to return null (not in library)
vi.mock('@/lib/utils/audiobook-matcher', () => ({
  findPlexMatch: vi.fn().mockResolvedValue(null),
}));

// Mock AudibleService
vi.mock('@/lib/integrations/audible.service', () => ({
  getAudibleService: () => ({
    getAudiobookDetails: vi.fn().mockResolvedValue(null),
  }),
}));

// Mock job queue
vi.mock('@/lib/services/job-queue.service', () => ({
  getJobQueueService: () => ({
    addSearchJob: vi.fn().mockResolvedValue(undefined),
    addNotificationJob: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock getSiblingAsins from works.service
const mockGetSiblingAsins = vi.fn().mockResolvedValue(new Map());
const mockSeedAsin = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/services/works.service', () => ({
  getSiblingAsins: (...args: any[]) => mockGetSiblingAsins(...args),
  seedAsin: (...args: any[]) => mockSeedAsin(...args),
}));

const TEST_AUDIOBOOK = {
  asin: 'B00TEST001',
  title: 'Test Book',
  author: 'Test Author',
};

const TEST_USER_ID = 'user-123';

describe('createRequestForUser — ignore list', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no existing requests, no library matches
    prismaMock.request.findFirst.mockResolvedValue(null);
    prismaMock.audiobook.findFirst.mockResolvedValue(null);
    prismaMock.audiobook.create.mockResolvedValue({
      id: 'audiobook-1',
      audibleAsin: TEST_AUDIOBOOK.asin,
      title: TEST_AUDIOBOOK.title,
      author: TEST_AUDIOBOOK.author,
      narrator: null,
    });
    prismaMock.request.create.mockResolvedValue({
      id: 'request-1',
      userId: TEST_USER_ID,
      audiobookId: 'audiobook-1',
      status: 'pending',
      audiobook: { id: 'audiobook-1', title: 'Test Book' },
      user: { id: TEST_USER_ID, plexUsername: 'testuser' },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      role: 'user',
      autoApproveRequests: true,
      plexUsername: 'testuser',
    });

    // Default: not ignored
    prismaMock.ignoredAudiobook.findUnique.mockResolvedValue(null);
    prismaMock.ignoredAudiobook.findFirst.mockResolvedValue(null);
    mockGetSiblingAsins.mockResolvedValue(new Map());
    mockSeedAsin.mockResolvedValue(undefined);
  });

  it('blocks auto-request when ASIN is directly ignored', async () => {
    prismaMock.ignoredAudiobook.findUnique.mockResolvedValue({
      id: 'ignored-1',
      userId: TEST_USER_ID,
      asin: TEST_AUDIOBOOK.asin,
    });

    const { createRequestForUser } = await import('@/lib/services/request-creator.service');
    const result = await createRequestForUser(TEST_USER_ID, TEST_AUDIOBOOK);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('ignored');
      expect(result.message).toContain('ignore list');
    }

    // Should NOT create a request
    expect(prismaMock.request.create).not.toHaveBeenCalled();
  });

  it('blocks auto-request when sibling ASIN is ignored', async () => {
    // Direct ASIN not ignored
    prismaMock.ignoredAudiobook.findUnique.mockResolvedValue(null);

    // But a sibling is ignored
    mockGetSiblingAsins.mockResolvedValue(new Map([
      [TEST_AUDIOBOOK.asin, ['B00SIBLING']],
    ]));
    prismaMock.ignoredAudiobook.findFirst.mockResolvedValue({
      id: 'ignored-sibling',
      userId: TEST_USER_ID,
      asin: 'B00SIBLING',
    });

    const { createRequestForUser } = await import('@/lib/services/request-creator.service');
    const result = await createRequestForUser(TEST_USER_ID, TEST_AUDIOBOOK);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('ignored');
    }

    expect(prismaMock.request.create).not.toHaveBeenCalled();
  });

  it('allows manual request with bypassIgnore even when ignored', async () => {
    prismaMock.ignoredAudiobook.findUnique.mockResolvedValue({
      id: 'ignored-1',
      userId: TEST_USER_ID,
      asin: TEST_AUDIOBOOK.asin,
    });

    const { createRequestForUser } = await import('@/lib/services/request-creator.service');
    const result = await createRequestForUser(TEST_USER_ID, TEST_AUDIOBOOK, {
      bypassIgnore: true,
    });

    expect(result.success).toBe(true);
    expect(prismaMock.request.create).toHaveBeenCalled();

    // Should NOT have even checked the ignore list
    expect(prismaMock.ignoredAudiobook.findUnique).not.toHaveBeenCalled();
  });

  it('allows request when ASIN is not ignored', async () => {
    prismaMock.ignoredAudiobook.findUnique.mockResolvedValue(null);
    prismaMock.ignoredAudiobook.findFirst.mockResolvedValue(null);

    const { createRequestForUser } = await import('@/lib/services/request-creator.service');
    const result = await createRequestForUser(TEST_USER_ID, TEST_AUDIOBOOK);

    expect(result.success).toBe(true);
    expect(prismaMock.request.create).toHaveBeenCalled();
  });

  it('falls through gracefully when works expansion fails', async () => {
    prismaMock.ignoredAudiobook.findUnique.mockResolvedValue(null);
    mockGetSiblingAsins.mockRejectedValue(new Error('DB error'));

    const { createRequestForUser } = await import('@/lib/services/request-creator.service');
    const result = await createRequestForUser(TEST_USER_ID, TEST_AUDIOBOOK);

    // Should still succeed since direct check passed and expansion is best-effort
    expect(result.success).toBe(true);
    expect(prismaMock.request.create).toHaveBeenCalled();
  });

  it('does not check siblings when no sibling ASINs exist', async () => {
    prismaMock.ignoredAudiobook.findUnique.mockResolvedValue(null);
    mockGetSiblingAsins.mockResolvedValue(new Map());

    const { createRequestForUser } = await import('@/lib/services/request-creator.service');
    const result = await createRequestForUser(TEST_USER_ID, TEST_AUDIOBOOK);

    expect(result.success).toBe(true);
    // Should not have queried findFirst for sibling check since map was empty
    expect(prismaMock.ignoredAudiobook.findFirst).not.toHaveBeenCalled();
  });
});
