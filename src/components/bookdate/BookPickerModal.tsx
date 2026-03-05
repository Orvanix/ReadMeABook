/**
 * Component: BookDate Book Picker Modal
 * Documentation: documentation/features/bookdate.md
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface BookPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onConfirm: (selectedIds: string[]) => void;
  maxSelection: number;
}

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string | null;
}

export function BookPickerModal({
  isOpen,
  onClose,
  selectedIds,
  onConfirm,
  maxSelection,
}: BookPickerModalProps) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // Infinite scroll state
  const [displayedCount, setDisplayedCount] = useState(100); // Start with 100 books
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load library books when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLibraryBooks();
      setLocalSelectedIds(selectedIds); // Reset to initial selection when reopening
      setDisplayedCount(100); // Reset displayed count
      setSearchQuery(''); // Reset search
    }
  }, [isOpen]);

  const loadLibraryBooks = async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/bookdate/library', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load library books');
      }

      const data = await response.json();
      setBooks(data.books || []);
    } catch (error: any) {
      console.error('Load library books error:', error);
      setError(error.message || 'Failed to load library books');
    } finally {
      setLoading(false);
    }
  };

  const toggleBook = (bookId: string) => {
    setLocalSelectedIds(prev => {
      if (prev.includes(bookId)) {
        // Deselect
        return prev.filter(id => id !== bookId);
      } else {
        // Select (only if under max)
        if (prev.length < maxSelection) {
          return [...prev, bookId];
        }
        return prev; // Already at max
      }
    });
  };

  // Reset displayed count when search query changes
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setDisplayedCount(100); // Reset to show first 100 results
  };

  const handleConfirm = () => {
    onConfirm(localSelectedIds);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedIds(selectedIds); // Reset to original
    onClose();
  };

  // Filter books by search query
  const filteredBooks = books.filter(book => {
    const query = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    );
  });

  // Only display a subset for performance (infinite scroll)
  const displayedBooks = filteredBooks.slice(0, displayedCount);
  const hasMore = displayedCount < filteredBooks.length;

  const isMaxReached = localSelectedIds.length >= maxSelection;

  // Infinite scroll observer
  useEffect(() => {
    const currentFilteredLength = filteredBooks.length;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          // Load more books when bottom sentinel is visible
          setDisplayedCount(prev => Math.min(prev + 100, currentFilteredLength));
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loading, filteredBooks.length]); // Re-run when loading state or filtered length changes

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Select Your Favorite Books
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose up to {maxSelection} books that represent your favorites
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Selection Counter */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`text-sm font-medium ${isMaxReached ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {localSelectedIds.length} / {maxSelection} selected
                {isMaxReached && (
                  <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                    (Maximum reached)
                  </span>
                )}
              </div>
              {localSelectedIds.length > 0 && (
                <button
                  onClick={() => setLocalSelectedIds([])}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Search Bar */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search books..."
              className="w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            />
          </div>
        </div>

        {/* Books Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No books match your search' : 'No books in your library'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedBooks.map((book, index) => {
                const isSelected = localSelectedIds.includes(book.id);
                const isDisabled = !isSelected && isMaxReached;

                return (
                  <button
                    key={book.id}
                    onClick={() => !isDisabled && toggleBook(book.id)}
                    disabled={isDisabled}
                    className={`group relative aspect-[2/3] rounded-lg overflow-hidden transition-all duration-200 ${
                      isSelected
                        ? 'ring-4 ring-blue-500 shadow-lg scale-105'
                        : isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:scale-105 hover:shadow-md'
                    }`}
                    style={{
                      animationDelay: `${index * 20}ms`,
                      animation: 'fadeIn 0.3s ease-out forwards',
                    }}
                  >
                    {/* Cover Image or Text Placeholder */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-600">
                      {book.coverUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder_cover.svg'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3">
                          <div className="text-center">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 line-clamp-4 mb-1">
                              {book.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {book.author}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selection Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Book Info on Hover */}
                    {!isSelected && !isDisabled && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white text-xs font-medium line-clamp-2">
                          {book.title}
                        </div>
                        <div className="text-white/80 text-xs line-clamp-1 mt-1">
                          {book.author}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {!loading && !error && hasMore && (
            <div ref={observerTarget} className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Show count info */}
          {!loading && !error && filteredBooks.length > 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              Showing {displayedBooks.length} of {filteredBooks.length} books
              {filteredBooks.length !== books.length && ` (filtered from ${books.length} total)`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={localSelectedIds.length === 0}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              Confirm Selection ({localSelectedIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* Fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
