/**
 * Component: Unified Pagination — context-aware floating paginator
 * Documentation: documentation/frontend/components.md
 *
 * A single floating pill that automatically tracks which section dominates
 * the viewport and shows pagination controls for that section.
 * Supports 1-12 sections dynamically with dot indicators for manual switching.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface PaginationSection {
  /** Display label, e.g. "Popular Audiobooks" */
  label: string;
  /** Tailwind color class applied to the active accent dot, e.g. "bg-blue-500" */
  accentColor: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Ref to the section element — used for intersection tracking */
  sectionRef: React.RefObject<HTMLElement | null>;
  /** Called when user clicks this section's dot while it's inactive — should scroll to section */
  onScrollToSection: () => void;
}

interface UnifiedPaginationProps {
  sections: PaginationSection[];
  footerRef?: React.RefObject<HTMLElement | null>;
}

// ---------------------------------------------------------------------------
// Small page-jump form — isolated to prevent key re-mounts on section switch
// ---------------------------------------------------------------------------

interface PageJumpProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PageJump({ currentPage, totalPages, onPageChange }: PageJumpProps) {
  const [value, setValue] = useState(currentPage.toString());

  // Sync when page changes externally (e.g. after scrollIntoView + setState)
  useEffect(() => {
    setValue(currentPage.toString());
  }, [currentPage]);

  const commit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
        onPageChange(parsed);
      } else {
        setValue(currentPage.toString());
      }
    },
    [value, currentPage, totalPages, onPageChange]
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
        Page
      </span>
      <form onSubmit={commit} className="inline-flex">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          className="w-10 px-1.5 py-0.5 text-center text-sm font-medium rounded-md
                     bg-black/[0.04] dark:bg-white/[0.08]
                     text-gray-900 dark:text-gray-100
                     border border-gray-300/60 dark:border-white/10
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                     transition-all duration-150"
          aria-label="Jump to page"
        />
      </form>
      <span className="text-sm text-gray-500 dark:text-gray-400 select-none whitespace-nowrap">
        of {totalPages}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section indicator dots — scales gracefully from 2-12 sections
// ---------------------------------------------------------------------------

interface SectionDotsProps {
  sections: PaginationSection[];
  activeIndex: number;
}

/**
 * For 2-4 sections: simple vertical dot column (original behavior, unchanged).
 * For 5+ sections: iOS-style compressed window of 5 visible dots.
 *   - Center slot = active section (full height, accent color)
 *   - ±1 slots = neighboring sections (medium)
 *   - ±2 slots = far neighbors (tiny, fade indicator)
 *   Dots beyond the window are hidden entirely. The window slides as activeIndex changes.
 */
function SectionDots({ sections, activeIndex }: SectionDotsProps) {
  const count = sections.length;

  // ---- Few sections: simple column ----
  if (count <= 4) {
    return (
      <div className="flex flex-col gap-1 pl-2 pr-3">
        {sections.map((section, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={`${section.label}-${idx}`}
              onClick={() => { if (!isActive) section.onScrollToSection(); }}
              disabled={isActive}
              title={section.label}
              aria-label={`Switch to ${section.label}`}
              className={`
                w-1.5 rounded-full transition-all duration-300 ease-out
                ${isActive
                  ? `${section.accentColor} h-4 opacity-100`
                  : 'bg-gray-300 dark:bg-gray-600 h-1.5 opacity-60 hover:opacity-90 hover:scale-110 cursor-pointer'
                }
              `}
            />
          );
        })}
      </div>
    );
  }

  // ---- Many sections: windowed 5-slot strip ----
  // The window is always 5 slots wide; we clamp it so it doesn't fall off edges.
  const WINDOW = 5;
  const half = Math.floor(WINDOW / 2); // 2

  // Ideal window start: center the active dot
  let windowStart = activeIndex - half;
  // Clamp so window stays within [0, count - WINDOW]
  windowStart = Math.max(0, Math.min(windowStart, count - WINDOW));
  const windowEnd = windowStart + WINDOW - 1; // inclusive

  // Distance from active within the window (for size calculation)
  // slots: [windowStart, windowStart+1, ..., windowEnd]
  const slots = Array.from({ length: WINDOW }, (_, i) => windowStart + i);

  // Sizes: index 0 (dist 2 from active) → 2.5px, dist 1 → 4px, dist 0 (active) → 6px
  const heightForDist = [16, 10, 7, 5, 3]; // px — dist 0..4 (we only use 0-2)

  // Whether we need overflow arrows (dots hidden beyond window edges)
  const hasHiddenLeft = windowStart > 0;
  const hasHiddenRight = windowEnd < count - 1;

  return (
    <div className="flex flex-col items-center gap-0.5 pl-2 pr-3">
      {/* Top fade indicator */}
      {hasHiddenLeft && (
        <div
          className="w-0.5 rounded-full bg-gray-300 dark:bg-gray-600 opacity-30 flex-shrink-0"
          style={{ height: '3px' }}
          aria-hidden="true"
        />
      )}

      {slots.map((sectionIdx) => {
        const section = sections[sectionIdx];
        const isActive = sectionIdx === activeIndex;
        const dist = Math.abs(sectionIdx - activeIndex);
        const h = heightForDist[Math.min(dist, heightForDist.length - 1)];

        // Active dot gets the section's accent color.
        // Inactive dots: the farther they are, the more faded.
        const opacityMap = [1, 0.55, 0.3];
        const opacity = opacityMap[Math.min(dist, opacityMap.length - 1)];

        return (
          <button
            key={`${section.label}-${sectionIdx}`}
            onClick={() => { if (!isActive) section.onScrollToSection(); }}
            disabled={isActive}
            title={section.label}
            aria-label={`Switch to ${section.label}`}
            style={{ height: `${h}px`, opacity }}
            className={`
              w-1.5 rounded-full flex-shrink-0
              transition-all duration-300 ease-out
              ${isActive
                ? `${section.accentColor} cursor-default`
                : 'bg-gray-400 dark:bg-gray-500 hover:opacity-90 cursor-pointer'
              }
            `}
          />
        );
      })}

      {/* Bottom fade indicator */}
      {hasHiddenRight && (
        <div
          className="w-0.5 rounded-full bg-gray-300 dark:bg-gray-600 opacity-30 flex-shrink-0"
          style={{ height: '3px' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function UnifiedPagination({ sections, footerRef }: UnifiedPaginationProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const ratiosRef = useRef<number[]>(sections.map(() => 0));
  const [anySectionVisible, setAnySectionVisible] = useState(false);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ratios array length in sync with sections
  useEffect(() => {
    ratiosRef.current = sections.map((_, i) => ratiosRef.current[i] || 0);
  }, [sections.length]);

  const activeSectionHasPages = sections[activeIndex]?.totalPages > 1;
  const shouldShow = anySectionVisible && !footerVisible && activeSectionHasPages && sections.length > 0;

  // ------------------------------------------------------------------
  // Intersection observers for all sections
  // ------------------------------------------------------------------
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach((section, idx) => {
      if (!section.sectionRef.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          ratiosRef.current[idx] = entry.intersectionRatio;
          const anyVisible = ratiosRef.current.some((r) => r > 0.05);
          setAnySectionVisible(anyVisible);

          // Find dominant section
          let maxRatio = -1;
          let dominant = 0;
          for (let i = 0; i < ratiosRef.current.length; i++) {
            if (ratiosRef.current[i] > maxRatio) {
              maxRatio = ratiosRef.current[i];
              dominant = i;
            }
          }

          setActiveIndex((current) => {
            if (current !== dominant) {
              setIsTransitioning(true);
              if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
              transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), 320);
              return dominant;
            }
            return current;
          });
        },
        {
          threshold: Array.from({ length: 21 }, (_, i) => i / 20),
          rootMargin: '-60px 0px -80px 0px',
        }
      );

      observer.observe(section.sectionRef.current);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
    // Re-run when section refs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.map((s) => s.sectionRef.current).join(',')]);

  // ------------------------------------------------------------------
  // Footer observer
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!footerRef?.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: [0, 0.01] }
    );
    observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, [footerRef]);

  // ------------------------------------------------------------------
  // Derived values
  // ------------------------------------------------------------------
  const active = sections[activeIndex];
  if (!active) return null;

  const handlePrev = () => {
    if (active.currentPage > 1) active.onPageChange(active.currentPage - 1);
  };
  const handleNext = () => {
    if (active.currentPage < active.totalPages) active.onPageChange(active.currentPage + 1);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-40
        transition-all duration-300 ease-out
        ${shouldShow
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-4 opacity-0 pointer-events-none'
        }
      `}
      aria-hidden={!shouldShow}
    >
      {/* Pill surface */}
      <div
        className="
          flex items-center gap-0
          bg-white/90 dark:bg-gray-900/90
          backdrop-blur-xl
          rounded-full
          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]
          dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3)]
          border border-gray-200/60 dark:border-white/[0.08]
          px-1.5 py-1.5
          overflow-hidden
        "
      >
        {/* Section selector dots — left side */}
        {sections.length > 1 && (
          <>
            <SectionDots sections={sections} activeIndex={activeIndex} />

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mr-3 flex-shrink-0" />
          </>
        )}

        {/* Label + controls — cross-fades on section switch */}
        <div
          className={`
            flex items-center gap-3
            transition-opacity duration-200 ease-in-out
            ${isTransitioning ? 'opacity-0' : 'opacity-100'}
          `}
          key={activeIndex}
        >
          {/* Section label — hidden on small screens */}
          <span className="hidden sm:block text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap pr-1 select-none max-w-[120px] truncate">
            {active.label}
          </span>

          {/* Previous */}
          <button
            onClick={handlePrev}
            disabled={active.currentPage === 1}
            aria-label="Previous page"
            className="
              p-1.5 rounded-full
              text-gray-600 dark:text-gray-300
              hover:bg-black/[0.06] dark:hover:bg-white/[0.08]
              active:bg-black/[0.1] dark:active:bg-white/[0.12]
              active:scale-95
              disabled:opacity-25 disabled:cursor-not-allowed
              transition-all duration-150
            "
          >
            <ChevronLeftIcon className="w-4 h-4" strokeWidth={2} />
          </button>

          {/* Page jump */}
          <PageJump
            currentPage={active.currentPage}
            totalPages={active.totalPages}
            onPageChange={active.onPageChange}
          />

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={active.currentPage === active.totalPages}
            aria-label="Next page"
            className="
              p-1.5 rounded-full
              text-gray-600 dark:text-gray-300
              hover:bg-black/[0.06] dark:hover:bg-white/[0.08]
              active:bg-black/[0.1] dark:active:bg-white/[0.12]
              active:scale-95
              disabled:opacity-25 disabled:cursor-not-allowed
              transition-all duration-150
            "
          >
            <ChevronRightIcon className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Right padding balance */}
        <div className="w-2" />
      </div>
    </div>
  );
}
