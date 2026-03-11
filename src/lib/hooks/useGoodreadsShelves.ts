/**
 * Component: Goodreads Shelves Hook
 * Documentation: documentation/frontend/components.md
 */

'use client';

import { createShelfHooks, ShelfBook } from './createShelfHooks';

export type { ShelfBook };

export interface GoodreadsShelf {
  id: string;
  name: string;
  rssUrl: string;
  lastSyncAt: string | null;
  createdAt: string;
  bookCount: number | null;
  autoRequest: boolean;
  books: ShelfBook[];
}

const { useList, useAdd, useDelete, useUpdate } =
  createShelfHooks<GoodreadsShelf>('/api/user/goodreads-shelves');

export const useGoodreadsShelves = useList;

export function useAddGoodreadsShelf() {
  const { addShelf: addGeneric, isLoading, error } = useAdd();

  const addShelf = async (rssUrl: string, autoRequest: boolean = true) => {
    return addGeneric({ rssUrl, autoRequest });
  };

  return { addShelf, isLoading, error };
}

export const useDeleteGoodreadsShelf = useDelete;

export function useUpdateGoodreadsShelf() {
  const { updateShelf: updateGeneric, isLoading, error } = useUpdate();

  const updateShelf = async (shelfId: string, updates: { rssUrl?: string; autoRequest?: boolean }) => {
    return updateGeneric(shelfId, updates);
  };

  return { updateShelf, isLoading, error };
}
