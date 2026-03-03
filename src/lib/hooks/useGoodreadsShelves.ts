/**
 * Component: Goodreads Shelves Hook
 * Documentation: documentation/frontend/components.md
 */

'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/utils/api';

export interface ShelfBook {
  coverUrl: string;
  asin: string | null;
  title: string;
  author: string;
}

export interface GoodreadsShelf {
  id: string;
  name: string;
  rssUrl: string;
  lastSyncAt: string | null;
  createdAt: string;
  bookCount: number | null;
  books: ShelfBook[];
}

const fetcher = (url: string) =>
  fetchWithAuth(url).then((res) => res.json());

export function useGoodreadsShelves() {
  const { accessToken } = useAuth();

  const endpoint = accessToken ? '/api/user/goodreads-shelves' : null;

  const { data, error, isLoading } = useSWR(
    endpoint,
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    shelves: (data?.shelves || []) as GoodreadsShelf[],
    isLoading,
    error,
  };
}

export function useAddGoodreadsShelf() {
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addShelf = async (rssUrl: string) => {
    if (!accessToken) throw new Error('Not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/user/goodreads-shelves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rssUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to add shelf');
      }

      // Revalidate shelves list
      mutate((key) => typeof key === 'string' && key.includes('/api/user/goodreads-shelves'));

      return data.shelf as GoodreadsShelf;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { addShelf, isLoading, error };
}

export function useDeleteGoodreadsShelf() {
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteShelf = async (shelfId: string) => {
    if (!accessToken) throw new Error('Not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/user/goodreads-shelves/${shelfId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to remove shelf');
      }

      // Revalidate shelves list
      mutate((key) => typeof key === 'string' && key.includes('/api/user/goodreads-shelves'));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteShelf, isLoading, error };
}

export function useUpdateGoodreadsShelf() {
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateShelf = async (shelfId: string, rssUrl: string) => {
    if (!accessToken) throw new Error('Not authenticated');

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/user/goodreads-shelves/${shelfId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rssUrl }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to update shelf');
      }

      // Revalidate shelves list
      mutate(
        (key) =>
          typeof key === 'string' &&
          key.includes('/api/user/goodreads-shelves'),
      );
      mutate(
        (key) => typeof key === 'string' && key.includes('/api/user/shelves'),
      );

      return data.shelf as GoodreadsShelf;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateShelf, isLoading, error };
}
