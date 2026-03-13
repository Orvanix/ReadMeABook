/**
 * Component: Bulk Import Scanner Utility
 * Documentation: documentation/features/bulk-import.md
 *
 * Recursively discovers audiobook folders, reads embedded metadata via ffprobe,
 * and prepares search terms for Audible matching. Used by the bulk import API.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { AUDIO_EXTENSIONS } from '../constants/audio-formats';

const execPromise = promisify(exec);

/** Maximum recursion depth for folder scanning. */
export const MAX_SCAN_DEPTH = 10;

/** Metadata extracted from an audio file via ffprobe. */
export interface AudioFileMetadata {
  title?: string;              // From 'album' tag (book title)
  author?: string;             // From 'album_artist' tag
  narrator?: string;           // From 'composer' tag
  contributingArtists?: string; // From 'artist' tag (contributing artists)
  trackTitle?: string;         // From 'title' tag (chapter/track name)
}

/** A discovered audiobook folder with its metadata and file info. */
export interface DiscoveredAudiobook {
  folderPath: string;
  folderName: string;
  relativePath: string;       // Relative to scan root
  audioFileCount: number;
  totalSizeBytes: number;
  metadata: AudioFileMetadata;
  searchTerm: string;         // Constructed search query for Audible
  metadataSource: 'tags' | 'file_name';  // Where the search term came from
}

/** Progress callback for streaming updates to the caller. */
export interface ScanProgress {
  phase: 'discovering' | 'reading_metadata';
  foldersScanned: number;
  audiobooksFound: number;
  currentFolder?: string;
}

/**
 * Check if a file has a supported audio extension.
 */
function isAudioFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return (AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Read audio metadata from a file using ffprobe.
 * Extracts album, album_artist, composer, and title tags.
 * Returns empty metadata on any failure (non-blocking).
 */
export async function readAudioMetadata(filePath: string): Promise<AudioFileMetadata> {
  try {
    const command = `ffprobe -v quiet -print_format json -show_format "${filePath}"`;
    const { stdout } = await execPromise(command, { timeout: 15000 });
    const data = JSON.parse(stdout);

    const tags = data?.format?.tags || {};

    // ffprobe tag names can be case-insensitive; check common variants
    const album = tags.album || tags.ALBUM || tags.Album || undefined;
    const albumArtist = tags.album_artist || tags.ALBUM_ARTIST || tags['Album Artist']
      || tags.albumartist || tags.ALBUMARTIST || undefined;
    const composer = tags.composer || tags.COMPOSER || tags.Composer || undefined;
    const artist = tags.artist || tags.ARTIST || tags.Artist
      || tags['Contributing artists'] || tags['CONTRIBUTING ARTISTS'] || undefined;
    const title = tags.title || tags.TITLE || tags.Title || undefined;

    return {
      title: album || undefined,
      author: albumArtist || undefined,
      narrator: composer || undefined,
      contributingArtists: artist || undefined,
      trackTitle: title || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Deduplicate names across author, narrator, and contributing artists fields.
 * Sometimes Album Artist contains "Author, Narrator" and Composer also has "Narrator",
 * and Contributing Artists may overlap with both.
 * We split on common delimiters and cross-reference to remove duplicates.
 */
export function deduplicateNames(
  rawAuthor?: string,
  rawNarrator?: string,
  rawContributingArtists?: string
): { author?: string; narrator?: string; contributingArtists?: string } {
  const splitNames = (str: string): string[] =>
    str.split(/[,;&]/).map((s) => s.trim()).filter(Boolean);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

  const authorNames = rawAuthor ? splitNames(rawAuthor) : [];
  const narratorNames = rawNarrator ? splitNames(rawNarrator) : [];
  const contributingNames = rawContributingArtists ? splitNames(rawContributingArtists) : [];

  // Build sets for cross-referencing
  const authorNormalized = new Set(authorNames.map(normalize));
  const narratorNormalized = new Set(narratorNames.map(normalize));

  // Remove from author list any name that appears in narrator list
  const dedupedAuthors = authorNames.filter(
    (name) => !narratorNormalized.has(normalize(name))
  );

  // Remove from contributing artists any name already in author or narrator
  const allKnown = new Set([...authorNormalized, ...narratorNormalized]);
  const dedupedContributing = contributingNames.filter(
    (name) => !allKnown.has(normalize(name))
  );

  return {
    author: dedupedAuthors.length > 0 ? dedupedAuthors.join(', ')
      : rawAuthor || undefined,
    narrator: rawNarrator || undefined,
    contributingArtists: dedupedContributing.length > 0
      ? dedupedContributing.join(', ')
      : undefined,
  };
}

/**
 * Build a search term from metadata or file name.
 * Returns the search term and the source it was derived from.
 * When metadata tags are present, constructs "Title Author Narrator ContributingArtists".
 * When tags are empty, falls back to the first audio file's name (cleaned).
 */
export function buildSearchTerm(
  metadata: AudioFileMetadata,
  firstFileName: string
): { searchTerm: string; source: 'tags' | 'file_name' } {
  const { author, narrator, contributingArtists } = deduplicateNames(
    metadata.author,
    metadata.narrator,
    metadata.contributingArtists
  );
  const title = metadata.title;

  // If we have at least a title from metadata, use tags
  if (title) {
    const parts = [title];
    if (author) parts.push(author);
    if (narrator) parts.push(narrator);
    if (contributingArtists) parts.push(contributingArtists);
    return { searchTerm: parts.join(' '), source: 'tags' };
  }

  // Fallback: clean up the first audio file name and use it as search term
  const cleaned = firstFileName
    .replace(/\.[^.]+$/, '')                       // Remove file extension
    .replace(/[\[\(][A-Z0-9]{10}[\]\)]/g, '')     // Remove ASIN in brackets
    .replace(/[\[\(]\d{4}[\]\)]/g, '')             // Remove year in brackets
    .replace(/^\d+[\s._-]+/, '')                   // Remove leading track numbers
    .replace(/[_]/g, ' ')                           // Underscores to spaces
    .replace(/\s+/g, ' ')                           // Collapse whitespace
    .trim();

  return { searchTerm: cleaned || firstFileName, source: 'file_name' };
}

/**
 * Scan a single directory for audio files.
 * Returns audio file names and total size, or null if no audio files found.
 */
async function scanDirectoryForAudio(
  dirPath: string
): Promise<{ audioFiles: string[]; totalSize: number } | null> {
  try {
    const children = await fs.readdir(dirPath, { withFileTypes: true });
    const audioFiles: string[] = [];
    let totalSize = 0;

    for (const child of children) {
      if (child.isFile() && isAudioFile(child.name)) {
        audioFiles.push(child.name);
        try {
          const stat = await fs.stat(path.join(dirPath, child.name));
          totalSize += stat.size;
        } catch {
          /* skip unreadable files */
        }
      }
    }

    if (audioFiles.length === 0) return null;

    audioFiles.sort((a, b) => a.localeCompare(b));
    return { audioFiles, totalSize };
  } catch {
    return null;
  }
}

/**
 * Recursively discover audiobook folders starting from a root path.
 *
 * A folder is classified as an "audiobook folder" if it contains audio files.
 * Once a folder is classified as an audiobook, its subfolders are NOT scanned
 * further (the audio-containing folder is the audiobook boundary).
 *
 * @param rootPath - The root directory to scan
 * @param onProgress - Optional callback for progress updates
 * @param abortSignal - Optional AbortSignal to cancel the scan
 * @returns Array of discovered audiobook folders with metadata
 */
export async function discoverAudiobooks(
  rootPath: string,
  onProgress?: (progress: ScanProgress) => void,
  abortSignal?: AbortSignal
): Promise<DiscoveredAudiobook[]> {
  const results: DiscoveredAudiobook[] = [];
  let foldersScanned = 0;

  async function walk(currentPath: string, depth: number): Promise<void> {
    if (depth > MAX_SCAN_DEPTH) return;
    if (abortSignal?.aborted) return;

    foldersScanned++;

    onProgress?.({
      phase: 'discovering',
      foldersScanned,
      audiobooksFound: results.length,
      currentFolder: path.basename(currentPath),
    });

    // Check if this folder contains audio files
    const audioResult = await scanDirectoryForAudio(currentPath);

    if (audioResult) {
      // This is an audiobook folder — read metadata and add to results
      const firstFile = path.join(currentPath, audioResult.audioFiles[0]);
      const metadata = await readAudioMetadata(firstFile);

      onProgress?.({
        phase: 'reading_metadata',
        foldersScanned,
        audiobooksFound: results.length + 1,
        currentFolder: path.basename(currentPath),
      });

      const folderName = path.basename(currentPath);
      const relativePath = path.relative(rootPath, currentPath).replace(/\\/g, '/');
      const firstFileName = audioResult.audioFiles[0];
      const { searchTerm, source } = buildSearchTerm(metadata, firstFileName);

      results.push({
        folderPath: currentPath.replace(/\\/g, '/'),
        folderName,
        relativePath: relativePath || folderName,
        audioFileCount: audioResult.audioFiles.length,
        totalSizeBytes: audioResult.totalSize,
        metadata,
        searchTerm,
        metadataSource: source,
      });

      // Do NOT recurse into subfolders of audiobook folders
      return;
    }

    // No audio files here — recurse into subfolders
    try {
      const children = await fs.readdir(currentPath, { withFileTypes: true });
      const subdirs = children
        .filter((c) => c.isDirectory() && !c.name.startsWith('.'))
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const subdir of subdirs) {
        if (abortSignal?.aborted) return;
        await walk(path.join(currentPath, subdir.name), depth + 1);
      }
    } catch {
      /* directory not readable — skip */
    }
  }

  await walk(rootPath, 0);
  return results;
}
