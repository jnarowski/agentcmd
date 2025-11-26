import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a UUID v4 string
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, A, or B
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Truncate a file path intelligently for display
 * Preserves the start and end of the path while truncating the middle
 *
 * @param path - The full file path to truncate
 * @param maxLength - Maximum length before truncation (default: 50 for desktop, 30 for mobile)
 * @returns Truncated path with ellipsis in the middle if needed
 *
 * @example
 * truncatePath('/Users/john/Dev/very/long/path/to/project', 30)
 * // Returns: '/Users/.../to/project'
 */
export function truncatePath(path: string, maxLength: number = 50): string {
  if (!path || path.length <= maxLength) {
    return path;
  }

  // For very short maxLength, just use end ellipsis
  if (maxLength < 15) {
    return path.slice(0, maxLength - 3) + '...';
  }

  // Split into segments
  const segments = path.split('/').filter(Boolean);

  // If only one or two segments, use simple truncation
  if (segments.length <= 2) {
    return path.slice(0, maxLength - 3) + '...';
  }

  // Keep first segment (usually /Users or /home) and last segment (project name)
  const firstSegment = '/' + segments[0];
  const lastSegment = segments[segments.length - 1];

  // Calculate space for middle ellipsis
  const endLength = Math.min(lastSegment.length, Math.floor(maxLength * 0.4));
  const startLength = Math.max(
    firstSegment.length,
    maxLength - endLength - 4 // 4 for '.../'
  );

  // If we can't fit start + ... + end, just show the end
  if (startLength + endLength + 4 > maxLength) {
    return '.../' + path.slice(-(maxLength - 4));
  }

  // Build truncated path
  return firstSegment + '/.../' + lastSegment;
}
