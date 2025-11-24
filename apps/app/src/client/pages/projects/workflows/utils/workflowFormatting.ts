import { formatDate } from "@/shared/utils/formatDate";

/**
 * Format file size in bytes to human-readable string
 * Examples: "1.2 MB", "345 KB", "5.6 GB", "128 B"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Invalid';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Ensure we don't exceed available units
  const unitIndex = Math.min(i, units.length - 1);
  const value = bytes / Math.pow(k, unitIndex);

  // Format with 1 decimal place for values >= 10, 2 decimals for smaller values
  const decimals = value >= 10 ? 1 : 2;

  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Format a date to relative time string
 * Examples: "2 minutes ago", "3 hours ago", "2 days ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'in the future';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (seconds > 10) {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }

  return 'just now';
}

/**
 * Format a date to absolute time string
 * Examples: "Jan 3, 2025 at 2:34 PM"
 */
export function formatAbsoluteTime(date: Date | string): string {
  return formatDate(date, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Truncate long text with ellipsis
 * Examples: "This is a very long tex..." (max 20)
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format step name to title case
 * Examples: "clone-repository" -> "Clone Repository"
 */
export function formatStepName(stepName: string): string {
  return stepName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get file icon emoji based on mime type or extension
 */
export function getFileIcon(fileName: string, mimeType: string): string {
  // Check mime type first
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType === 'application/json') return '📋';
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-tar' ||
    mimeType === 'application/gzip'
  ) {
    return '📦';
  }

  // Check file extension
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'txt':
    case 'md':
    case 'log':
      return '📝';
    case 'html':
    case 'htm':
      return '🌐';
    case 'css':
    case 'scss':
    case 'less':
      return '🎨';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return '📜';
    case 'json':
    case 'yaml':
    case 'yml':
    case 'xml':
      return '📋';
    case 'csv':
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'doc':
    case 'docx':
      return '📃';
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
      return '📦';
    default:
      return '📄';
  }
}
