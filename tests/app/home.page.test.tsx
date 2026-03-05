/**
 * Component: Home Page Tests
 * Documentation: documentation/features/home-sections.md
 */

// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMockAuthState } from '../helpers/mock-auth';
import { resetMockRouter } from '../helpers/mock-next-navigation';

const useAudiobooksMock = vi.hoisted(() => vi.fn());
const useCategoryAudiobooksMock = vi.hoisted(() => vi.fn());
const useHomeSectionsMock = vi.hoisted(() => vi.fn());
const usePreferencesMock = vi.hoisted(() => ({
  cardSize: 5,
  setCardSize: vi.fn(),
  squareCovers: false,
  setSquareCovers: vi.fn(),
  hideAvailable: false,
  setHideAvailable: vi.fn(),
}));

vi.mock('@/lib/hooks/useAudiobooks', () => ({
  useAudiobooks: useAudiobooksMock,
}));

vi.mock('@/lib/hooks/useHomeSections', () => ({
  useHomeSections: useHomeSectionsMock,
  useCategoryAudiobooks: useCategoryAudiobooksMock,
}));

vi.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: () => usePreferencesMock,
}));

vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/components/audiobooks/AudiobookGrid', () => ({
  AudiobookGrid: ({ audiobooks, cardSize }: { audiobooks: any[]; cardSize?: number }) => (
    <div data-testid="grid" data-count={audiobooks.length} data-size={cardSize}>
      {audiobooks.map((book) => (
        <div key={book.asin}>{book.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ui/CardSizeControls', () => ({
  CardSizeControls: ({ size }: { size: number }) => <div data-testid="card-size" data-size={size} />,
}));

vi.mock('@/components/ui/UnifiedPagination', () => ({
  UnifiedPagination: ({
    sections,
  }: {
    sections: Array<{
      label: string;
      onPageChange: (page: number) => void;
    }>;
  }) => (
    <div>
      {sections.map((s) => (
        <button key={s.label} type="button" onClick={() => s.onPageChange(2)}>
          {s.label} next
        </button>
      ))}
    </div>
  ),
}));

describe('HomePage', () => {
  beforeEach(() => {
    resetMockAuthState();
    resetMockRouter();
    useAudiobooksMock.mockReset();
    useCategoryAudiobooksMock.mockReset();
    useHomeSectionsMock.mockReset();
    usePreferencesMock.cardSize = 5;
    usePreferencesMock.setCardSize.mockReset();
    usePreferencesMock.hideAvailable = false;
    vi.resetModules();

    // Default: return popular + new_releases sections
    useHomeSectionsMock.mockReturnValue({
      sections: [
        { id: '1', sectionType: 'popular', categoryId: null, categoryName: null, sortOrder: 0 },
        { id: '2', sectionType: 'new_releases', categoryId: null, categoryName: null, sortOrder: 1 },
      ],
      isLoading: false,
      nextRefresh: null,
      saveSections: vi.fn(),
      mutate: vi.fn(),
      error: null,
    });
  });

  it('renders empty state messaging for popular audiobooks', async () => {
    useAudiobooksMock.mockImplementation((category: string) => {
      if (category === 'popular') {
        return {
          audiobooks: [],
          isLoading: false,
          totalPages: 1,
          message: 'Nothing here',
        };
      }
      return {
        audiobooks: [{ asin: 'n1', title: 'New Release', author: 'Author' }],
        isLoading: false,
        totalPages: 2,
        message: null,
      };
    });

    const { default: HomePage } = await import('@/app/page');
    render(<HomePage />);

    expect(screen.getByText('No audiobooks yet')).toBeInTheDocument();
    // Raw API message is intentionally not shown; friendly empty state is rendered instead
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument();
    expect(screen.getByText('New Release')).toBeInTheDocument();
  });

  it('renders customize button', async () => {
    useAudiobooksMock.mockReturnValue({
      audiobooks: [],
      isLoading: false,
      totalPages: 0,
      message: null,
    });

    const { default: HomePage } = await import('@/app/page');
    render(<HomePage />);

    expect(screen.getByLabelText('Customize home page')).toBeInTheDocument();
  });

  it('renders empty state when no sections configured', async () => {
    useHomeSectionsMock.mockReturnValue({
      sections: [],
      isLoading: false,
      nextRefresh: null,
      saveSections: vi.fn(),
      mutate: vi.fn(),
      error: null,
    });

    const { default: HomePage } = await import('@/app/page');
    render(<HomePage />);

    expect(screen.getByText(/No sections configured/)).toBeInTheDocument();
  });
});
