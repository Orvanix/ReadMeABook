/**
 * Component: Ignored Audiobooks Hook
 * Documentation: documentation/features/ignored-audiobooks.md
 *
 * Provides hooks for checking and toggling audiobook ignore status.
 * - useIsIgnored(asin): check if a specific book is ignored
 * - useToggleIgnore(): toggle ignore on/off for a book
 * - useIgnoredList(): list all ignored books for the current user
 */

'use client';

import useSWR, { mutate } from 'swr';
import { authenticatedFetcher, fetchWithAuth } from '@/lib/utils/api';

interface IgnoredAudiobook {
  id: string;
  asin: string;
  title: string;
  author: string;
  coverArtUrl?: string;
  createdAt: string;
}

interface IgnoreCheckResult {
  ignored: boolean;
  ignoredId?: string;
}

/**
 * Check if a specific ASIN is ignored by the current user.
 * Includes works-system expansion on the server side.
 */
export function useIsIgnored(asin: string | null) {
  const endpoint = asin ? `/api/user/ignored-audiobooks/check/${asin}` : null;

  const { data, error, isLoading } = useSWR<IgnoreCheckResult>(
    endpoint,
    authenticatedFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    isIgnored: data?.ignored ?? false,
    ignoredId: data?.ignoredId ?? null,
    isLoading,
    error,
  };
}

/**
 * Toggle ignore status for an audiobook.
 * Returns { addIgnore, removeIgnore } functions.
 */
export function useToggleIgnore() {
  const addIgnore = async (book: {
    asin: string;
    title: string;
    author: string;
    coverArtUrl?: string;
  }): Promise<IgnoredAudiobook> => {
    const res = await fetchWithAuth('/api/user/ignored-audiobooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to ignore audiobook');
    }

    const result = await res.json();

    // Invalidate the check cache for this ASIN
    mutate(`/api/user/ignored-audiobooks/check/${book.asin}`);
    // Invalidate the full list
    mutate('/api/user/ignored-audiobooks');

    return result.ignoredAudiobook;
  };

  const removeIgnore = async (id: string, asin: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/user/ignored-audiobooks/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to un-ignore audiobook');
    }

    // Invalidate the check cache for this ASIN
    mutate(`/api/user/ignored-audiobooks/check/${asin}`);
    // Invalidate the full list
    mutate('/api/user/ignored-audiobooks');
  };

  return { addIgnore, removeIgnore };
}

/**
 * List all ignored audiobooks for the current user.
 */
export function useIgnoredList() {
  const { data, error, isLoading } = useSWR<{ ignoredAudiobooks: IgnoredAudiobook[] }>(
    '/api/user/ignored-audiobooks',
    authenticatedFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    ignoredAudiobooks: data?.ignoredAudiobooks ?? [],
    isLoading,
    error,
  };
}
