/**
 * Component: Ignored Audiobooks Utility
 * Documentation: documentation/features/ignored-audiobooks.md
 *
 * Shared utility for annotating audiobook lists with per-user ignore status.
 * Uses a single bulk query for the user's full ignore list, then annotates in-memory.
 */

import { prisma } from '@/lib/db';

/**
 * Annotate an array of audiobook objects with `isIgnored: boolean`.
 * Fetches the user's full ignore list in one query and matches by ASIN.
 *
 * If userId is undefined (unauthenticated), all books get `isIgnored: false`.
 */
export async function annotateWithIgnoreStatus<T extends { asin: string }>(
  audiobooks: T[],
  userId?: string
): Promise<(T & { isIgnored: boolean })[]> {
  if (!userId || audiobooks.length === 0) {
    return audiobooks.map((book) => ({ ...book, isIgnored: false }));
  }

  // Single query: get all ASINs this user has ignored
  const ignoredEntries = await prisma.ignoredAudiobook.findMany({
    where: { userId },
    select: { asin: true },
  });

  const ignoredAsinSet = new Set(ignoredEntries.map((e) => e.asin));

  return audiobooks.map((book) => ({
    ...book,
    isIgnored: ignoredAsinSet.has(book.asin),
  }));
}
