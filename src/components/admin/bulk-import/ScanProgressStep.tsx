/**
 * Component: Bulk Import - Scan Progress Step
 * Documentation: documentation/features/bulk-import.md
 *
 * Displays progress during folder discovery and Audible matching phases.
 * Shows animated indicators, counts, and cancel/retry controls.
 */

'use client';

import React from 'react';
import {
  FolderIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ScanProgressEvent, MatchingProgressEvent } from './types';

interface ScanProgressStepProps {
  scanProgress: ScanProgressEvent | null;
  matchingProgress: MatchingProgressEvent | null;
  scanPhase: 'discovering' | 'matching' | 'idle';
  error: string | null;
  booksFound: number;
  onCancel: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export function ScanProgressStep({
  scanProgress,
  matchingProgress,
  scanPhase,
  error,
  booksFound,
  onCancel,
  onRetry,
  onBack,
}: ScanProgressStepProps) {
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-16">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Scan Failed
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
          {error}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Retry Scan
          </button>
        </div>
      </div>
    );
  }

  const matchPercent = matchingProgress
    ? Math.round((matchingProgress.current / matchingProgress.total) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-800 flex items-center justify-center">
          <FolderIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 animate-spin" />
      </div>

      {/* Phase-specific content */}
      {scanPhase === 'discovering' && (
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Scanning Folders
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
            Searching for folders containing audiobook files...
          </p>

          {scanProgress && (
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {scanProgress.foldersScanned}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Folders Scanned
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {scanProgress.audiobooksFound}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Audiobooks Found
                </div>
              </div>
            </div>
          )}

          {scanProgress?.currentFolder && (
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-md">
              {scanProgress.currentFolder}
            </p>
          )}
        </>
      )}

      {scanPhase === 'matching' && (
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Matching Against Audible
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            Searching Audible for each discovered audiobook...
          </p>

          {matchingProgress && (
            <>
              {/* Progress bar */}
              <div className="w-full max-w-sm mb-3">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${matchPercent}%` }}
                  />
                </div>
              </div>

              <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {matchingProgress.current} / {matchingProgress.total}
              </div>

              {matchingProgress.folderName && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 truncate max-w-md">
                  {matchingProgress.folderName}
                </p>
              )}

              {/* Books matched so far count */}
              {booksFound > 0 && (
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  {booksFound} book{booksFound !== 1 ? 's' : ''} matched so far
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="mt-8 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
        Cancel Scan
      </button>
    </div>
  );
}
