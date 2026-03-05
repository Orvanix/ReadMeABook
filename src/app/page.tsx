/**
 * Component: Homepage - Audiobook Discovery (Dynamic Sections)
 * Documentation: documentation/features/home-sections.md
 */

'use client';

import { useState, useRef, useEffect, useCallback, createRef } from 'react';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UnifiedPagination, PaginationSection } from '@/components/ui/UnifiedPagination';
import { HomeSection, SECTION_DOT_COLORS } from '@/components/home/HomeSection';
import { HomeSectionConfigModal } from '@/components/home/HomeSectionConfigModal';
import { useHomeSections } from '@/lib/hooks/useHomeSections';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

function getSectionTitle(sectionType: string, categoryName?: string | null): string {
  if (sectionType === 'popular') return 'Popular Audiobooks';
  if (sectionType === 'new_releases') return 'New Releases';
  return categoryName || 'Category';
}

export default function HomePage() {
  const { sections, nextRefresh, isLoading: sectionsLoading, saveSections } = useHomeSections();
  const { cardSize, setCardSize, squareCovers, setSquareCovers, hideAvailable, setHideAvailable } = usePreferences();

  // Per-section pagination state
  const [pages, setPages] = useState<Record<string, number>>({});
  const [totalPagesMap, setTotalPagesMap] = useState<Record<string, number>>({});
  const [configOpen, setConfigOpen] = useState(false);

  const footerRef = useRef<HTMLElement>(null);

  // Create stable refs for each section
  const sectionRefsMap = useRef<Map<string, React.RefObject<HTMLElement | null>>>(new Map());

  const getSectionKey = (s: { sectionType: string; categoryId: string | null }) =>
    s.sectionType === 'category' ? `category:${s.categoryId}` : s.sectionType;

  // Ensure refs exist for current sections
  sections.forEach((s) => {
    const key = getSectionKey(s);
    if (!sectionRefsMap.current.has(key)) {
      sectionRefsMap.current.set(key, createRef<HTMLElement>());
    }
  });

  // Reset pages and totalPages when hideAvailable changes
  useEffect(() => {
    setPages({});
    setTotalPagesMap({});
  }, [hideAvailable]);

  const getPage = (key: string) => pages[key] || 1;
  const setPage = useCallback((key: string, page: number) => {
    setPages((prev) => ({ ...prev, [key]: page }));
  }, []);
  const handleTotalPagesChange = useCallback((key: string, totalPages: number) => {
    setTotalPagesMap((prev) => {
      if (prev[key] === totalPages) return prev;
      return { ...prev, [key]: totalPages };
    });
  }, []);

  // Build pagination sections for the floating pill
  const paginationSections: PaginationSection[] = sections.map((s, i) => {
    const key = getSectionKey(s);
    const ref = sectionRefsMap.current.get(key)!;
    return {
      label: getSectionTitle(s.sectionType, s.categoryName),
      accentColor: SECTION_DOT_COLORS[i % SECTION_DOT_COLORS.length],
      currentPage: getPage(key),
      totalPages: totalPagesMap[key] || 1,
      onPageChange: (page: number) => {
        setPage(key, page);
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      sectionRef: ref,
      onScrollToSection: () =>
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    };
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Header />

        <main className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl space-y-8 sm:space-y-12">
          {/* Loading state */}
          {sectionsLoading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}

          {/* Empty state */}
          {!sectionsLoading && sections.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No sections configured. Click Customize to add sections to your home page.
              </p>
              <button
                onClick={() => setConfigOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4 mr-2" />
                Customize Home
              </button>
            </div>
          )}

          {/* Dynamic sections */}
          {!sectionsLoading &&
            sections.map((section, index) => {
              const key = getSectionKey(section);
              const ref = sectionRefsMap.current.get(key)!;

              return (
                <HomeSection
                  key={key}
                  sectionType={section.sectionType as 'popular' | 'new_releases' | 'category'}
                  categoryId={section.categoryId}
                  categoryName={section.categoryName}
                  colorIndex={index}
                  page={getPage(key)}
                  onPageChange={(page) => {
                    setPage(key, page);
                    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  sectionRef={ref}
                  cardSize={cardSize}
                  squareCovers={squareCovers}
                  hideAvailable={hideAvailable}
                  onToggleHideAvailable={setHideAvailable}
                  onToggleSquareCovers={setSquareCovers}
                  onCardSizeChange={setCardSize}
                  onConfigOpen={index === 0 ? () => setConfigOpen(true) : undefined}
                  onTotalPagesChange={(tp) => handleTotalPagesChange(key, tp)}
                  nextRefresh={nextRefresh}
                />
              );
            })}

          {/* Call to Action */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 sm:p-8 text-center border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Can't find what you're looking for?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Use our search to find any audiobook from Audible
            </p>
            <a
              href="/search"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              Search Audiobooks
            </a>
          </section>
        </main>

        {/* Footer */}
        <footer ref={footerRef} className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>ReadMeABook - Audiobook Library Management System</p>
            </div>
          </div>
        </footer>

        {/* Unified Pagination — dynamic sections */}
        {paginationSections.length > 0 && (
          <UnifiedPagination
            footerRef={footerRef}
            sections={paginationSections}
          />
        )}

        {/* Config Modal */}
        <HomeSectionConfigModal
          isOpen={configOpen}
          onClose={() => setConfigOpen(false)}
          sections={sections}
          onSave={saveSections}
        />
      </div>
    </ProtectedRoute>
  );
}
