/**
 * Video Downloader — reusable HTTP video download with retry and validation.
 *
 * Phase 3A: infrastructure only. All providers currently use mock mode,
 * so this utility will be used when ProviderManager switches to real mode.
 *
 * Usage:
 *   import { downloadVideo } from '../lib/video-downloader';
 *   const result = await downloadVideo('https://cdn.provider.com/video.mp4', './output/video.mp4');
 *   // => { localPath: './output/video.mp4', sizeBytes: 1234567 }
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DownloadOptions {
  /** Max retry attempts (default 3). */
  maxRetries?: number;
  /** Timeout per attempt in ms (default 60_000 = 1 min). */
  timeoutMs?: number;
  /** Minimum file size in bytes to consider the download valid (default 1024). */
  minSizeBytes?: number;
  /** HTTP headers to include. */
  headers?: Record<string, string>;
  /** Called on progress (bytesReceived, totalBytes if known). */
  onProgress?: (received: number, total?: number) => void;
}

export interface DownloadResult {
  localPath: string;
  sizeBytes: number;
}

// ── Implementation ───────────────────────────────────────────────────────────

/**
 * Download a video from a URL to a local path with retry and validation.
 */
export async function downloadVideo(
  url: string,
  outputPath: string,
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  const maxRetries = options.maxRetries ?? 3;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const minSizeBytes = options.minSizeBytes ?? 1024;
  const headers = options.headers ?? {};
  const onProgress = options.onProgress;

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TikTok-VF/1.0',
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream to disk with progress
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (onProgress) {
        onProgress(buffer.length);
      }

      // Validate minimum size
      if (buffer.length < minSizeBytes) {
        throw new Error(`Downloaded file too small: ${buffer.length} bytes (min: ${minSizeBytes})`);
      }

      fs.writeFileSync(outputPath, buffer);
      return { localPath: outputPath, sizeBytes: buffer.length };
    } catch (err: any) {
      lastError = err;
      // Clean up partial file
      try { fs.unlinkSync(outputPath); } catch {}

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt, 30_000);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Download failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}

/** Check if a URL appears to be a downloadable video URL. */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  const lower = url.split('?')[0].toLowerCase();
  return videoExtensions.some(ext => lower.endsWith(ext)) || url.startsWith('http');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Metadata helpers ──────────────────────────────────────────────────────────

/**
 * Safely serialize a metadata object to a JSON string for storage
 * in the `video_tasks.metadata` (String/VARCHAR) column.
 *
 * Returns `"{}"` for undefined/null input so the column is never empty.
 */
export function serializeMetadata(obj: Record<string, unknown> | null | undefined): string {
  if (!obj || typeof obj !== 'object') return '{}';
  // Defend against accidentally passing something that isn't a plain object
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}

/**
 * Safely deserialize a metadata string from the database back to an object.
 *
 * Handles edge cases:
 *   - empty string ""       → {}
 *   - "[object Object]"     → {}  (the most common Prisma String-column bug)
 *   - null / undefined       → {}
 *   - invalid JSON           → {}
 */
export function deserializeMetadata<T = Record<string, unknown>>(raw: string | null | undefined): T {
  if (!raw || raw === '' || raw === '[object Object]') {
    return {} as unknown as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as unknown as T;
  }
}
